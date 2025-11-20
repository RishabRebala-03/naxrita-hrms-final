from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from config.db import mongo
from config_email import email_service
from utils.log_utils import log_leave_action, trim_leave
from utils.leave_accrual import accrue_monthly_leaves
from utils.recalculate_balances import recalculate_all_balances

leave_bp = Blueprint("leave_bp", __name__)


# -------------------------------
# Get All Leaves (for Dashboard)
# -------------------------------
@leave_bp.route("/all", methods=["GET"])
def get_all_leaves():
    try:
        leaves = list(mongo.db.leaves.find())
        
        for leave in leaves:
            leave['_id'] = str(leave['_id'])
            
            if isinstance(leave.get('employee_id'), ObjectId):
                employee = mongo.db.users.find_one({"_id": leave['employee_id']})
                if employee:
                    leave['employee_name'] = employee.get('name', 'Unknown Employee')
                    leave['employee_email'] = employee.get('email', '')
                    leave['employee_designation'] = employee.get('designation', '')
                    leave['employee_department'] = employee.get('department', '')
                    leave['employee_dateOfBirth'] = employee.get('dateOfBirth')
                leave['employee_id'] = str(leave['employee_id'])
            elif not leave.get('employee_name'):
                leave['employee_name'] = 'Unknown Employee'
        
        print(f"✅ Found {len(leaves)} total leaves")
        return jsonify(leaves), 200
    except Exception as e:
        print(f"❌ Error fetching all leaves: {str(e)}")
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Get Leave History for Employee
# -------------------------------
@leave_bp.route("/history/<employee_id>", methods=["GET"])
def get_leave_history(employee_id):
    try:
        print(f"📋 Fetching leave history for employee: {employee_id}")
        leaves = list(mongo.db.leaves.find({"employee_id": ObjectId(employee_id)}).sort("applied_on", -1))
        
        for leave in leaves:
            leave['_id'] = str(leave['_id'])
            if isinstance(leave.get('employee_id'), ObjectId):
                leave['employee_id'] = str(leave['employee_id'])
        
        print(f"✅ Found {len(leaves)} leave records for employee {employee_id}")
        return jsonify(leaves), 200
    except Exception as e:
        print(f"❌ Error fetching leave history: {str(e)}")
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Apply for Leave (WITH EMAIL NOTIFICATION)
# -------------------------------
@leave_bp.route("/apply", methods=["POST"])
def apply_leave():
    try:
        data = request.get_json()
        employee_id = data.get("employee_id")
        leave_type = data.get("leave_type")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        reason = data.get("reason", "")

        if not all([employee_id, leave_type, start_date, end_date]):
            return jsonify({"error": "Missing required fields"}), 400

        # Fetch employee
        employee = mongo.db.users.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        # Convert dates
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        days = (end - start).days + 1
        today = datetime.now().date()

        # -----------------------------------------
        # BLOCK PAST OR SAME-DAY LEAVE APPLICATIONS
        # -----------------------------------------
        if start.date() <= today:   # block same-day & past
            return jsonify({
                "error": f"Leave cannot be applied for today or past dates ({start_date})."
            }), 400

        if end.date() <= today:
            return jsonify({
                "error": f"End date must be in the future ({end_date})."
            }), 400

        # -----------------------------------------
        # OPTIONAL LEAVE VALIDATION (with Birthday Support)
        # -----------------------------------------
        if leave_type.lower() == "optional":

            # Optional leave must ALWAYS be exactly 1 day
            if days != 1:
                return jsonify({
                    "error": "Optional leave can only be taken for a single optional holiday date."
                }), 400

            # ---- 🎉 BIRTHDAY CHECK (Auto-Allow) ----
            dob = employee.get("dateOfBirth")
            if dob:
                # Convert DOB if stored as ISO string
                if isinstance(dob, str):
                    try:
                        dob = datetime.fromisoformat(dob.replace("Z", "+00:00"))
                    except:
                        dob = None

                if isinstance(dob, datetime):
                    # Match MONTH + DAY only (year does NOT matter)
                    if dob.month == start.month and dob.day == start.day:
                        print("🎉 Birthday Optional Leave Auto-Approved Day")
                        # Skip holiday DB check, continue normal processing
                    else:
                        # If NOT birthday → must match declared optional holiday
                        holiday = mongo.db.holidays.find_one({
                            "date": start_date,
                            "type": "optional"
                        })
                        if not holiday:
                            return jsonify({
                                "error": f"No optional holiday on {start_date}. Cannot apply optional leave."
                            }), 400
                else:
                    # DOB invalid → fall back to holiday DB rule
                    holiday = mongo.db.holidays.find_one({
                        "date": start_date,
                        "type": "optional"
                    })
                    if not holiday:
                        return jsonify({
                            "error": f"No optional holiday on {start_date}. Cannot apply optional leave."
                        }), 400

            else:
                # If employee has no DOB stored → fallback to normal optional holiday check
                holiday = mongo.db.holidays.find_one({
                    "date": start_date,
                    "type": "optional"
                })
                if not holiday:
                    return jsonify({
                        "error": f"No optional holiday on {start_date}. Cannot apply optional leave."
                    }), 400


        # -----------------------------------------
        # PLANNED LEAVE VALIDATION
        # -----------------------------------------
        if leave_type.lower() == "planned":
            days_difference = (start.date() - today).days
            if days_difference < 7:
                return jsonify({
                    "error": "Planned leave must be applied at least 7 days in advance."
                }), 400

        # -----------------------------------------
        # UNIVERSAL LEAVE BALANCE CHECK
        # -----------------------------------------
        leave_balance = employee.get("leaveBalance", {
            "sick": 6, "sickTotal": 6,
            "planned": 12, "plannedTotal": 12,
            "optional": 2, "optionalTotal": 2,
            "lwp": 0
        })

        leave_type_key = leave_type.lower()

        if leave_type_key in ["sick", "planned", "optional"]:
            available = leave_balance.get(leave_type_key, 0)
            if days > available:
                return jsonify({
                    "error": f"Insufficient {leave_type} leave balance. Available: {available}, Requested: {days}"
                }), 400

        # -------------------------------
        # CREATE LEAVE REQUEST
        # -------------------------------
        leave_request = {
            "employee_id": ObjectId(employee_id),
            "employee_name": employee.get("name", "Unknown"),
            "employee_email": employee.get("email", ""),
            "employee_designation": employee.get("designation", ""),
            "employee_department": employee.get("department", ""),
            "leave_type": leave_type,
            "start_date": start_date,
            "end_date": end_date,
            "days": days,
            "reason": reason,
            "status": "Pending",
            "applied_on": datetime.utcnow()
        }

        result = mongo.db.leaves.insert_one(leave_request)

        # Log submission
        log_leave_action(
            leave_id=str(result.inserted_id),
            employee_id=employee_id,
            action="Submitted",
            performed_by=employee.get("email"),
            new_data=trim_leave(leave_request)
        )

        return jsonify({
            "message": "Leave applied successfully!",
            "id": str(result.inserted_id)
        }), 201

    except Exception as e:
        print("❌ Error applying leave:", str(e))
        return jsonify({"error": str(e)}), 500



@leave_bp.route("/update/<leave_id>", methods=["PUT"])
def update_leave(leave_id):
    data = request.get_json()

    leave = mongo.db.leaves.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        return jsonify({"error": "Leave request not found"}), 404

    if leave.get("status") != "Pending":
        return jsonify({"error": "Only pending leaves can be edited"}), 400

    # Calculate new days
    start = datetime.strptime(data["start_date"], "%Y-%m-%d")
    end = datetime.strptime(data["end_date"], "%Y-%m-%d")
    days = (end - start).days + 1

    # -----------------------------------------
    # PREVENT APPLYING LEAVE FOR PAST DATES
    # -----------------------------------------
    today = datetime.now().date()

    if start.date() < today:
        return jsonify({
            "error": f"Cannot apply leave for past dates. ({start_date}) already passed."
        }), 400

    if end.date() < today:
        return jsonify({
            "error": f"End date cannot be before today."
        }), 400

    old_data = leave.copy()

    # Update DB
    mongo.db.leaves.update_one(
        {"_id": ObjectId(leave_id)},
        {
            "$set": {
                "leave_type": data["leave_type"],
                "start_date": data["start_date"],
                "end_date": data["end_date"],
                "reason": data.get("reason", ""),
                "days": days,
            }
        }
    )

    new_data = mongo.db.leaves.find_one({"_id": ObjectId(leave_id)})

    log_leave_action(
        leave_id=leave_id,
        employee_id=str(leave["employee_id"]),
        action="Edited",
        performed_by=leave.get("employee_email", "Unknown"),
        old_data=trim_leave(old_data),
        new_data=trim_leave(new_data)
    )

    return jsonify({"message": "Leave updated successfully"}), 200


# -------------------------------
# Cancel Leave (Employee)
# -------------------------------
@leave_bp.route("/cancel/<leave_id>", methods=["PUT"])
def cancel_leave(leave_id):
    try:
        print(f"🔍 Cancel request for leave: {leave_id}")

        obj_id = ObjectId(leave_id)
        leave = mongo.db.leaves.find_one({"_id": obj_id})

        if not leave:
            return jsonify({"error": "Leave request not found"}), 404

        if leave.get("status") != "Pending":
            return jsonify({"error": "Only pending leave requests can be cancelled"}), 400

        mongo.db.leaves.update_one(
            {"_id": obj_id},
            {"$set": {
                "status": "Cancelled",
                "cancelled_on": datetime.utcnow()
            }}
        )

        # Log cancellation
        log_leave_action(
            leave_id=leave_id,
            employee_id=str(leave["employee_id"]),
            action="Cancelled",
            performed_by=leave["employee_email"]
        )

        print("✅ Leave cancelled successfully")
        return jsonify({"message": "Leave cancelled successfully"}), 200

    except Exception as e:
        print("❌ Cancel error:", str(e))
        return jsonify({"error": str(e)}), 500



# -------------------------------
# Get Leave Balance for Employee
# -------------------------------
# -------------------------------
# Get Leave Balance for Employee
# -------------------------------
@leave_bp.route("/balance/<employee_id>", methods=["GET"])
def get_leave_balance(employee_id):
    try:
        employee = mongo.db.users.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        leave_balance = employee.get("leaveBalance", {
            "sick": 0,
            "sickTotal": 0,
            "planned": 0,
            "plannedTotal": 0,
            "optional": 2,
            "optionalTotal": 2,
            "lwp": 0
        })
        
        # Calculate months employed
        join_date = employee.get("dateOfJoining")
        if join_date:
            today = datetime.utcnow()
            months = (today.year - join_date.year) * 12 + (today.month - join_date.month) + 1
            leave_balance["monthsEmployed"] = months
            leave_balance["accrualRate"] = {"planned": "1.0/month", "sick": "0.5/month"}
        
        # Ensure totals are set
        if "sickTotal" not in leave_balance:
            leave_balance["sickTotal"] = 0
        if "plannedTotal" not in leave_balance:
            leave_balance["plannedTotal"] = 0
        if "optionalTotal" not in leave_balance:
            leave_balance["optionalTotal"] = 2
            
        return jsonify(leave_balance), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Manager: View Pending Requests
# -------------------------------
@leave_bp.route("/pending/<manager_email>", methods=["GET"])
def get_pending_requests(manager_email):
    try:
        manager = mongo.db.users.find_one({"email": manager_email})
        if not manager:
            return jsonify({"error": "Manager not found"}), 404

        employees = list(mongo.db.users.find({"reportsTo": manager["_id"]}))
        employee_ids = [emp["_id"] for emp in employees]

        pending_leaves = list(mongo.db.leaves.find({
            "employee_id": {"$in": employee_ids},
            "status": "Pending"
        }).sort("applied_on", -1))

        for leave in pending_leaves:
            leave["_id"] = str(leave["_id"])

            emp_obj_id = leave.get("employee_id")

            if isinstance(emp_obj_id, ObjectId):
                employee = mongo.db.users.find_one({"_id": emp_obj_id})
                leave["employee_id"] = str(emp_obj_id)

                if employee:
                    # 🎂 Add DOB for birthday badge
                    leave["employee_dateOfBirth"] = employee.get("dateOfBirth")

        print(f"✅ Found {len(pending_leaves)} pending requests for manager {manager_email}")
        return jsonify(pending_leaves), 200
    except Exception as e:
        print(f"❌ Error fetching pending requests: {str(e)}")
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Manager: Approve / Reject Leave
# -------------------------------
@leave_bp.route("/update_status/<leave_id>", methods=["PUT"])
def update_leave_status(leave_id):
    try:
        data = request.get_json()
        status = data.get("status")
        rejection_reason = data.get("rejection_reason", "")
        approved_by = data.get("approved_by", "")

        if status not in ["Approved", "Rejected"]:
            return jsonify({"error": "Invalid status"}), 400

        if status == "Rejected" and not rejection_reason.strip():
            return jsonify({"error": "Rejection reason is mandatory"}), 400

        if status == "Approved" and not approved_by.strip():
            return jsonify({"error": "Approver name is mandatory"}), 400

        # Fetch full leave record BEFORE updating
        leave_record = mongo.db.leaves.find_one({"_id": ObjectId(leave_id)})
        if not leave_record:
            return jsonify({"error": "Leave record not found"}), 404

        old_trimmed = trim_leave(leave_record)

        # Build update fields
        update_data = {"status": status}

        if status == "Rejected":
            update_data["rejection_reason"] = rejection_reason
            update_data["rejected_on"] = datetime.utcnow()

        elif status == "Approved":
            update_data["approved_by"] = approved_by
            update_data["approved_on"] = datetime.utcnow()

        # Update DB
        mongo.db.leaves.update_one(
            {"_id": ObjectId(leave_id)},
            {"$set": update_data}
        )

        # Fetch updated full leave record
        updated_record = mongo.db.leaves.find_one({"_id": ObjectId(leave_id)})
        new_trimmed = trim_leave(updated_record)

        # Log the action
        log_leave_action(
            leave_id=leave_id,
            employee_id=str(leave_record["employee_id"]),
            action=status,
            performed_by=approved_by if status == "Approved" else (approved_by or "Manager"),
            remarks=rejection_reason if status == "Rejected" else "Leave approved",
            old_data=old_trimmed,
            new_data=new_trimmed
        )

        # Deduct leave balance **only after logging**
        if status == "Approved":
            employee = mongo.db.users.find_one({"_id": leave_record["employee_id"]})
            if employee:
                leave_balance = employee.get("leaveBalance", {
                    "sick": 6,
                    "sickTotal": 6,
                    "planned": 12,
                    "plannedTotal": 12,
                    "optional": 2,
                    "optionalTotal": 2,
                    "lwp": 0
                })

                leave_type = leave_record["leave_type"].lower()
                days = leave_record.get("days", 1)

                # Deduction rules
                if leave_type in ["sick", "planned", "optional"]:
                    available = leave_balance.get(leave_type, 0)
                    if available >= days:
                        leave_balance[leave_type] = available - days
                    else:
                        leave_balance["lwp"] = leave_balance.get("lwp", 0) + days
                elif leave_type == "lwp":
                    leave_balance["lwp"] = leave_balance.get("lwp", 0) + days

                # Save balance
                mongo.db.users.update_one(
                    {"_id": leave_record["employee_id"]},
                    {"$set": {"leaveBalance": leave_balance}}
                )

        return jsonify({"message": f"Leave {status.lower()} successfully!"}), 200

    except Exception as e:
        print("❌ Error updating leave status:", str(e))
        return jsonify({"error": str(e)}), 500
    

# Add this route at the bottom
@leave_bp.route("/accrue_monthly", methods=["POST"])
def trigger_monthly_accrual():
    """
    Manual trigger for monthly accrual (can be called by cron/scheduler)
    In production, this should be password-protected or called by a scheduler
    """
    try:
        result = accrue_monthly_leaves()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# Add this route at the bottom
@leave_bp.route("/recalculate_all_balances", methods=["POST"])
def trigger_recalculate_balances():
    """
    Admin-only route to recalculate all employee leave balances
    Should be protected in production
    """
    try:
        result = recalculate_all_balances()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500