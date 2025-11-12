from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from config.db import mongo
from config_email import email_service

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

        # Fetch employee details
        employee = mongo.db.users.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        # Calculate number of days
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        days = (end - start).days + 1

        # Validate planned leave is at least 7 days in advance
        if leave_type == "Planned":
            from datetime import timedelta
            today = datetime.now().date()
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            days_difference = (start - today).days
            
            if days_difference < 7:
                return jsonify({
                    "error": "Planned leave must be applied at least 7 days in advance"
                }), 400

        # Create leave request
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

        # Insert leave request
        result = mongo.db.leaves.insert_one(leave_request)
        print(f"✅ Leave applied successfully for {employee.get('name')}")

        # 📧 SEND EMAIL NOTIFICATION TO MANAGER
        try:
            if employee.get('reportsTo'):
                manager = mongo.db.users.find_one({"_id": employee['reportsTo']})
                
                if manager:
                    employee_data = {
                        'name': employee.get('name', 'Unknown'),
                        'email': employee.get('email', ''),
                        'designation': employee.get('designation', 'N/A'),
                        'department': employee.get('department', 'N/A')
                    }
                    
                    manager_data = {
                        'name': manager.get('name', 'Manager'),
                        'email': manager.get('email', '')
                    }
                    
                    leave_data = {
                        'leave_type': leave_type,
                        'start_date': start_date,
                        'end_date': end_date,
                        'days': days,
                        'reason': reason
                    }
                    
                    email_sent = email_service.send_leave_application_notification(
                        employee_data=employee_data,
                        manager_data=manager_data,
                        leave_data=leave_data
                    )
                    
                    if email_sent:
                        print(f"📧 Email notification sent to {manager_data['email']}")
                    else:
                        print(f"⚠️ Failed to send email notification")
                else:
                    print(f"⚠️ Manager not found for employee {employee.get('name')}")
            else:
                print(f"⚠️ No reporting manager assigned for employee {employee.get('name')}")
        
        except Exception as email_error:
            print(f"⚠️ Email notification error: {str(email_error)}")
        
        return jsonify({
            "message": "Leave applied successfully!",
            "id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"❌ Error applying leave: {str(e)}")
        return jsonify({"error": str(e)}), 500


@leave_bp.route("/update/<leave_id>", methods=["PUT"])
def update_leave(leave_id):
    data = request.get_json()
    
    # Find the leave request
    leave = mongo.db.leaves.find_one({"_id": ObjectId(leave_id)})
    
    if not leave:
        return jsonify({"error": "Leave request not found"}), 404
    
    # Only allow editing pending leaves
    if leave.get("status") != "Pending":
        return jsonify({"error": "Only pending leaves can be edited"}), 400
    
    # Calculate new days
    start = datetime.strptime(data["start_date"], "%Y-%m-%d")
    end = datetime.strptime(data["end_date"], "%Y-%m-%d")
    days = (end - start).days + 1
    
    # Update the leave request
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
    
    return jsonify({"message": "Leave updated successfully"}), 200


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
            "sick": 6,
            "sickTotal": 6,
            "planned": 12,
            "plannedTotal": 12,
            "lwp": 0
        })
        
        # Ensure totals are set
        if "sickTotal" not in leave_balance:
            leave_balance["sickTotal"] = 6
        if "plannedTotal" not in leave_balance:
            leave_balance["plannedTotal"] = 12
            
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
            if isinstance(leave.get("employee_id"), ObjectId):
                leave["employee_id"] = str(leave["employee_id"])

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
        approved_by = data.get("approved_by", "")  # Add this line
        
        if status not in ["Approved", "Rejected"]:
            return jsonify({"error": "Invalid status"}), 400

        if status == "Rejected" and not rejection_reason.strip():
            return jsonify({"error": "Rejection reason is mandatory"}), 400
        
        # Add this validation for approval
        if status == "Approved" and not approved_by.strip():
            return jsonify({"error": "Approver name is mandatory"}), 400

        leave_record = mongo.db.leaves.find_one({"_id": ObjectId(leave_id)})
        if not leave_record:
            return jsonify({"error": "Leave record not found"}), 404

        # Update leave record
        update_data = {"status": status}
        if status == "Rejected":
            update_data["rejection_reason"] = rejection_reason
            update_data["rejected_on"] = datetime.utcnow()
        elif status == "Approved":
            update_data["approved_on"] = datetime.utcnow()
            update_data["approved_by"] = approved_by  # Add this line
        
        mongo.db.leaves.update_one({"_id": ObjectId(leave_id)}, {"$set": update_data})

        # Deduct leave balance only if approved
        if status == "Approved":
            employee_id = leave_record["employee_id"]
            employee = mongo.db.users.find_one({"_id": employee_id})
            if employee:
                leave_balance = employee.get("leaveBalance", {
                    "sick": 6,
                    "sickTotal": 6,
                    "planned": 12,
                    "plannedTotal": 12,
                    "lwp": 0
                })
                leave_type = leave_record["leave_type"].lower()
                days = leave_record.get("days", 1)
                
                # Map leave type to balance key
                if leave_type == "sick":
                    if leave_balance.get("sick", 0) >= days:
                        leave_balance["sick"] -= days
                    else:
                        # Insufficient sick leave, add to LWP
                        leave_balance["lwp"] = leave_balance.get("lwp", 0) + days
                elif leave_type == "planned":
                    if leave_balance.get("planned", 0) >= days:
                        leave_balance["planned"] -= days
                    else:
                        # Insufficient planned leave, add to LWP
                        leave_balance["lwp"] = leave_balance.get("lwp", 0) + days
                elif leave_type == "lwp":
                    # LWP is unlimited, just track it
                    leave_balance["lwp"] = leave_balance.get("lwp", 0) + days
                
                mongo.db.users.update_one({"_id": employee_id}, {"$set": {"leaveBalance": leave_balance}})

        print(f"✅ Leave {status.lower()} successfully")
        return jsonify({"message": f"Leave {status.lower()} successfully!"}), 200
    except Exception as e:
        print(f"❌ Error updating leave status: {str(e)}")
        return jsonify({"error": str(e)}), 500