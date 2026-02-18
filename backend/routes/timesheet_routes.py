# routes/timesheet_routes.py
from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime, timedelta
from config.db import mongo

timesheet_bp = Blueprint("timesheet_bp", __name__)


def serialize_timesheet(ts):
    """Helper to serialize timesheet documents"""
    if not ts:
        return None
    
    ts["_id"] = str(ts["_id"])
    ts["employee_id"] = str(ts["employee_id"])
    
    if "reporting_lead_id" in ts and ts["reporting_lead_id"]:
        ts["reporting_lead_id"] = str(ts["reporting_lead_id"])
    
    if "manager_id" in ts and ts["manager_id"]:
        ts["manager_id"] = str(ts["manager_id"])
    
    # Convert datetime fields
    datetime_fields = ["created_at", "updated_at", "submitted_at", 
                      "lead_approved_at", "manager_approved_at", 
                      "lead_rejected_at", "manager_rejected_at"]
    
    for field in datetime_fields:
        if field in ts and isinstance(ts[field], datetime):
            ts[field] = ts[field].isoformat()
    
    # Serialize entries array
    if "entries" in ts:
        for entry in ts["entries"]:
            if isinstance(entry.get("date"), datetime):
                entry["date"] = entry["date"].isoformat()
            if "_id" in entry and isinstance(entry["_id"], ObjectId):
                entry["_id"] = str(entry["_id"])
            if "charge_code_id" in entry and isinstance(entry["charge_code_id"], ObjectId):
                entry["charge_code_id"] = str(entry["charge_code_id"])
    
    # Serialize approval history
    if "approval_history" in ts:
        for history in ts["approval_history"]:
            if "timestamp" in history and isinstance(history["timestamp"], datetime):
                history["timestamp"] = history["timestamp"].isoformat()
            if "approver_id" in history and isinstance(history["approver_id"], ObjectId):
                history["approver_id"] = str(history["approver_id"])
    
    return ts


def create_notification(user_id, notification_type, message, related_timesheet_id=None):
    """Create notification for timesheet actions"""
    try:
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        notification = {
            "user_id": user_id,
            "type": notification_type,
            "message": message,
            "read": False,
            "createdAt": datetime.utcnow()
        }
        
        if related_timesheet_id:
            if isinstance(related_timesheet_id, str):
                related_timesheet_id = ObjectId(related_timesheet_id)
            notification["related_timesheet_id"] = related_timesheet_id
        
        mongo.db.notifications.insert_one(notification)
        print(f"✅ Timesheet notification created: {notification_type}")
    except Exception as e:
        print(f"❌ Error creating timesheet notification: {str(e)}")


# ========================================
# CREATE/SUBMIT TIMESHEET
# ========================================
@timesheet_bp.route("/create", methods=["POST"])
def create_timesheet():
    """
    Create and submit a timesheet for a week/period
    Body: {
        employee_id: str,
        period_start: "YYYY-MM-DD",
        period_end: "YYYY-MM-DD",
        entries: [
            {
                date: "YYYY-MM-DD",
                charge_code_id: str,
                hours: float,
                description: str,
                entry_type: "work" | "leave" | "holiday",
                leave_type: str (optional, for leave entries)
            }
        ]
    }
    """
    try:
        data = request.get_json()
        employee_id = data.get("employee_id")
        period_start = data.get("period_start")
        period_end = data.get("period_end")
        entries = data.get("entries", [])
        
        if not all([employee_id, period_start, period_end]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Get employee details
        employee = mongo.db.users.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            return jsonify({"error": "Employee not found"}), 404
        
        # Check for existing timesheet for this period
        existing = mongo.db.timesheets.find_one({
            "employee_id": ObjectId(employee_id),
            "period_start": period_start,
            "period_end": period_end
        })
        
        if existing and existing.get("status") != "draft":
            return jsonify({
                "error": "Timesheet already exists for this period and is not in draft status"
            }), 400
        
        # Get reporting hierarchy
        reporting_lead_id = employee.get("reportsTo")
        if not reporting_lead_id:
            return jsonify({"error": "No reporting lead found for employee"}), 404
        
        # Get manager (lead's manager or peopleLead)
        reporting_lead = mongo.db.users.find_one({"_id": reporting_lead_id})
        manager_id = reporting_lead.get("reportsTo") or employee.get("peopleLead")
        
        # Validate and process entries
        validated_entries = []
        for entry in entries:
            entry_date = entry.get("date")
            entry_type = entry.get("entry_type", "work")
            hours = float(entry.get("hours", 0))
            charge_code_id = entry.get("charge_code_id")
            description = entry.get("description", "")
            
            # Validate entry based on type
            if entry_type == "leave":
                # Validate leave entry
                leave_type = entry.get("leave_type")
                if not leave_type:
                    return jsonify({
                        "error": f"Leave type required for leave entry on {entry_date}"
                    }), 400
                
                # Check if leave is approved for this date
                approved_leave = mongo.db.leaves.find_one({
                    "employee_id": ObjectId(employee_id),
                    "status": "Approved",
                    "start_date": {"$lte": entry_date},
                    "end_date": {"$gte": entry_date},
                    "leave_type": leave_type
                })
                
                if not approved_leave:
                    return jsonify({
                        "error": f"No approved {leave_type} leave found for {entry_date}"
                    }), 400
                
                validated_entries.append({
                    "_id": ObjectId(),
                    "date": entry_date,
                    "entry_type": "leave",
                    "leave_type": leave_type,
                    "hours": hours,
                    "description": description,
                    "leave_id": approved_leave["_id"]
                })
            
            elif entry_type == "holiday":
                # Check if it's a public holiday
                holiday = mongo.db.holidays.find_one({
                    "date": entry_date,
                    "type": {"$in": ["public", "company"]}
                })
                
                if not holiday:
                    return jsonify({
                        "error": f"No public holiday found for {entry_date}"
                    }), 400
                
                validated_entries.append({
                    "_id": ObjectId(),
                    "date": entry_date,
                    "entry_type": "holiday",
                    "holiday_name": holiday.get("name"),
                    "hours": hours,
                    "description": description
                })
            
            else:  # work entry
                if not charge_code_id:
                    return jsonify({
                        "error": f"Charge code required for work entry on {entry_date}"
                    }), 400
                
                # Validate employee has access to this charge code
                assignment = mongo.db.charge_code_assignments.find_one({
                    "employee_id": ObjectId(employee_id),
                    "charge_code_id": ObjectId(charge_code_id),
                    "is_active": True
                })
                
                if not assignment:
                    return jsonify({
                        "error": f"You don't have access to this charge code"
                    }), 400
                
                # Get charge code details
                charge_code = mongo.db.charge_codes.find_one({"_id": ObjectId(charge_code_id)})
                
                validated_entries.append({
                    "_id": ObjectId(),
                    "date": entry_date,
                    "entry_type": "work",
                    "charge_code_id": ObjectId(charge_code_id),
                    "charge_code": charge_code.get("code") if charge_code else "",
                    "hours": hours,
                    "description": description
                })
        
        # Calculate total hours
        total_hours = sum(entry.get("hours", 0) for entry in validated_entries)
        
        # Create timesheet document
        timesheet = {
            "employee_id": ObjectId(employee_id),
            "employee_name": employee.get("name"),
            "employee_email": employee.get("email"),
            "period_start": period_start,
            "period_end": period_end,
            "entries": validated_entries,
            "total_hours": total_hours,
            "status": "pending_lead",  # pending_lead → pending_manager → approved
            "reporting_lead_id": reporting_lead_id,
            "manager_id": manager_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "submitted_at": datetime.utcnow(),
            "approval_history": []
        }
        
        # Insert or update
        if existing:
            # Update existing draft
            result = mongo.db.timesheets.update_one(
                {"_id": existing["_id"]},
                {"$set": timesheet}
            )
            timesheet_id = existing["_id"]
        else:
            # Create new
            result = mongo.db.timesheets.insert_one(timesheet)
            timesheet_id = result.inserted_id
        
        # Create notification for reporting lead
        lead = mongo.db.users.find_one({"_id": reporting_lead_id})
        if lead:
            notification_msg = f"{employee.get('name')} submitted timesheet for {period_start} to {period_end} ({total_hours} hours)"
            create_notification(
                user_id=reporting_lead_id,
                notification_type="timesheet_submitted",
                message=notification_msg,
                related_timesheet_id=timesheet_id
            )
        
        return jsonify({
            "message": "Timesheet submitted successfully",
            "timesheet_id": str(timesheet_id)
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating timesheet: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# GET EMPLOYEE'S TIMESHEETS
# ========================================
@timesheet_bp.route("/employee/<employee_id>", methods=["GET"])
def get_employee_timesheets(employee_id):
    """Get all timesheets for an employee"""
    try:
        timesheets = list(mongo.db.timesheets.find({
            "employee_id": ObjectId(employee_id)
        }).sort("period_start", -1))
        
        return jsonify([serialize_timesheet(ts) for ts in timesheets]), 200
        
    except Exception as e:
        print(f"❌ Error fetching employee timesheets: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# GET PENDING TIMESHEETS FOR LEAD
# ========================================
@timesheet_bp.route("/pending/lead/<user_id>", methods=["GET"])
def get_pending_for_lead(user_id):
    """Get timesheets pending lead approval"""
    try:
        timesheets = list(mongo.db.timesheets.find({
            "reporting_lead_id": ObjectId(user_id),
            "status": "pending_lead"
        }).sort("submitted_at", -1))
        
        return jsonify([serialize_timesheet(ts) for ts in timesheets]), 200
        
    except Exception as e:
        print(f"❌ Error fetching pending timesheets: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# GET PENDING TIMESHEETS FOR MANAGER
# ========================================
@timesheet_bp.route("/pending/manager/<user_id>", methods=["GET"])
def get_pending_for_manager(user_id):
    """Get timesheets pending manager approval"""
    try:
        timesheets = list(mongo.db.timesheets.find({
            "manager_id": ObjectId(user_id),
            "status": "pending_manager"
        }).sort("submitted_at", -1))
        
        return jsonify([serialize_timesheet(ts) for ts in timesheets]), 200
        
    except Exception as e:
        print(f"❌ Error fetching pending timesheets: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# LEAD APPROVAL
# ========================================
@timesheet_bp.route("/approve/lead/<timesheet_id>", methods=["PUT"])
def lead_approve_timesheet(timesheet_id):
    """
    Lead approves timesheet
    Body: {
        approved_by: str (user_id),
        comments: str (optional)
    }
    """
    try:
        data = request.get_json()
        approved_by = data.get("approved_by")
        comments = data.get("comments", "")
        
        timesheet = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not timesheet:
            return jsonify({"error": "Timesheet not found"}), 404
        
        if timesheet.get("status") != "pending_lead":
            return jsonify({"error": "Timesheet not pending lead approval"}), 400
        
        # Get approver details
        approver = mongo.db.users.find_one({"_id": ObjectId(approved_by)})
        if not approver:
            return jsonify({"error": "Approver not found"}), 404
        
        # Update status to pending manager
        approval_entry = {
            "stage": "lead",
            "action": "approved",
            "approver_id": ObjectId(approved_by),
            "approver_name": approver.get("name"),
            "comments": comments,
            "timestamp": datetime.utcnow()
        }
        
        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {
                "$set": {
                    "status": "pending_manager",
                    "lead_approved_at": datetime.utcnow(),
                    "lead_approved_by": approver.get("name"),
                    "updated_at": datetime.utcnow()
                },
                "$push": {"approval_history": approval_entry}
            }
        )
        
        # Notify manager
        if timesheet.get("manager_id"):
            notification_msg = f"Timesheet from {timesheet.get('employee_name')} ({timesheet.get('period_start')} to {timesheet.get('period_end')}) approved by lead - awaiting your approval"
            create_notification(
                user_id=timesheet["manager_id"],
                notification_type="timesheet_pending_manager",
                message=notification_msg,
                related_timesheet_id=timesheet_id
            )
        
        # Notify employee
        notification_msg = f"Your timesheet ({timesheet.get('period_start')} to {timesheet.get('period_end')}) was approved by your lead and is now pending manager approval"
        create_notification(
            user_id=timesheet["employee_id"],
            notification_type="timesheet_lead_approved",
            message=notification_msg,
            related_timesheet_id=timesheet_id
        )
        
        return jsonify({"message": "Timesheet approved by lead successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error in lead approval: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# LEAD REJECTION
# ========================================
@timesheet_bp.route("/reject/lead/<timesheet_id>", methods=["PUT"])
def lead_reject_timesheet(timesheet_id):
    """
    Lead rejects timesheet
    Body: {
        rejected_by: str (user_id),
        rejection_reason: str (required)
    }
    """
    try:
        data = request.get_json()
        rejected_by = data.get("rejected_by")
        rejection_reason = data.get("rejection_reason", "").strip()
        
        if not rejection_reason:
            return jsonify({"error": "Rejection reason is required"}), 400
        
        timesheet = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not timesheet:
            return jsonify({"error": "Timesheet not found"}), 404
        
        if timesheet.get("status") != "pending_lead":
            return jsonify({"error": "Timesheet not pending lead approval"}), 400
        
        # Get rejector details
        rejector = mongo.db.users.find_one({"_id": ObjectId(rejected_by)})
        if not rejector:
            return jsonify({"error": "Rejector not found"}), 404
        
        # Update status to rejected
        rejection_entry = {
            "stage": "lead",
            "action": "rejected",
            "approver_id": ObjectId(rejected_by),
            "approver_name": rejector.get("name"),
            "comments": rejection_reason,
            "timestamp": datetime.utcnow()
        }
        
        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {
                "$set": {
                    "status": "rejected_by_lead",
                    "lead_rejected_at": datetime.utcnow(),
                    "lead_rejected_by": rejector.get("name"),
                    "rejection_reason": rejection_reason,
                    "updated_at": datetime.utcnow()
                },
                "$push": {"approval_history": rejection_entry}
            }
        )
        
        # Notify employee
        notification_msg = f"Your timesheet ({timesheet.get('period_start')} to {timesheet.get('period_end')}) was rejected by your lead. Reason: {rejection_reason}"
        create_notification(
            user_id=timesheet["employee_id"],
            notification_type="timesheet_rejected",
            message=notification_msg,
            related_timesheet_id=timesheet_id
        )
        
        return jsonify({"message": "Timesheet rejected by lead"}), 200
        
    except Exception as e:
        print(f"❌ Error in lead rejection: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# MANAGER APPROVAL (FINAL)
# ========================================
@timesheet_bp.route("/approve/manager/<timesheet_id>", methods=["PUT"])
def manager_approve_timesheet(timesheet_id):
    """
    Manager approves timesheet (final approval)
    Body: {
        approved_by: str (user_id),
        comments: str (optional)
    }
    """
    try:
        data = request.get_json()
        approved_by = data.get("approved_by")
        comments = data.get("comments", "")
        
        timesheet = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not timesheet:
            return jsonify({"error": "Timesheet not found"}), 404
        
        if timesheet.get("status") != "pending_manager":
            return jsonify({"error": "Timesheet not pending manager approval"}), 400
        
        # Get approver details
        approver = mongo.db.users.find_one({"_id": ObjectId(approved_by)})
        if not approver:
            return jsonify({"error": "Approver not found"}), 404
        
        # Update status to approved (FINAL)
        approval_entry = {
            "stage": "manager",
            "action": "approved",
            "approver_id": ObjectId(approved_by),
            "approver_name": approver.get("name"),
            "comments": comments,
            "timestamp": datetime.utcnow()
        }
        
        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {
                "$set": {
                    "status": "approved",
                    "manager_approved_at": datetime.utcnow(),
                    "manager_approved_by": approver.get("name"),
                    "updated_at": datetime.utcnow(),
                    "is_locked": True  # Lock for editing
                },
                "$push": {"approval_history": approval_entry}
            }
        )
        
        # Notify employee
        notification_msg = f"Your timesheet ({timesheet.get('period_start')} to {timesheet.get('period_end')}) has been fully approved and is now locked"
        create_notification(
            user_id=timesheet["employee_id"],
            notification_type="timesheet_approved",
            message=notification_msg,
            related_timesheet_id=timesheet_id
        )
        
        return jsonify({"message": "Timesheet approved successfully (final approval)"}), 200
        
    except Exception as e:
        print(f"❌ Error in manager approval: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# MANAGER REJECTION
# ========================================
@timesheet_bp.route("/reject/manager/<timesheet_id>", methods=["PUT"])
def manager_reject_timesheet(timesheet_id):
    """
    Manager rejects timesheet
    Body: {
        rejected_by: str (user_id),
        rejection_reason: str (required)
    }
    """
    try:
        data = request.get_json()
        rejected_by = data.get("rejected_by")
        rejection_reason = data.get("rejection_reason", "").strip()
        
        if not rejection_reason:
            return jsonify({"error": "Rejection reason is required"}), 400
        
        timesheet = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not timesheet:
            return jsonify({"error": "Timesheet not found"}), 404
        
        if timesheet.get("status") != "pending_manager":
            return jsonify({"error": "Timesheet not pending manager approval"}), 400
        
        # Get rejector details
        rejector = mongo.db.users.find_one({"_id": ObjectId(rejected_by)})
        if not rejector:
            return jsonify({"error": "Rejector not found"}), 404
        
        # Update status to rejected
        rejection_entry = {
            "stage": "manager",
            "action": "rejected",
            "approver_id": ObjectId(rejected_by),
            "approver_name": rejector.get("name"),
            "comments": rejection_reason,
            "timestamp": datetime.utcnow()
        }
        
        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {
                "$set": {
                    "status": "rejected_by_manager",
                    "manager_rejected_at": datetime.utcnow(),
                    "manager_rejected_by": rejector.get("name"),
                    "rejection_reason": rejection_reason,
                    "updated_at": datetime.utcnow()
                },
                "$push": {"approval_history": rejection_entry}
            }
        )
        
        # Notify employee
        notification_msg = f"Your timesheet ({timesheet.get('period_start')} to {timesheet.get('period_end')}) was rejected by manager. Reason: {rejection_reason}"
        create_notification(
            user_id=timesheet["employee_id"],
            notification_type="timesheet_rejected",
            message=notification_msg,
            related_timesheet_id=timesheet_id
        )
        
        return jsonify({"message": "Timesheet rejected by manager"}), 200
        
    except Exception as e:
        print(f"❌ Error in manager rejection: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# GET ALL TIMESHEETS (ADMIN)
# ========================================
@timesheet_bp.route("/all", methods=["GET"])
def get_all_timesheets():
    """Get all timesheets (admin view)"""
    try:
        # Optional filters
        status = request.args.get("status")
        employee_id = request.args.get("employee_id")
        
        query = {}
        if status:
            query["status"] = status
        if employee_id:
            query["employee_id"] = ObjectId(employee_id)
        
        timesheets = list(mongo.db.timesheets.find(query).sort("submitted_at", -1))
        
        return jsonify([serialize_timesheet(ts) for ts in timesheets]), 200
        
    except Exception as e:
        print(f"❌ Error fetching all timesheets: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# AUTO-POPULATE HOLIDAYS
# ========================================
@timesheet_bp.route("/populate_holidays", methods=["POST"])
def populate_holidays():
    """
    Auto-populate public holidays for a timesheet period
    Body: {
        period_start: "YYYY-MM-DD",
        period_end: "YYYY-MM-DD"
    }
    """
    try:
        data = request.get_json()
        period_start = data.get("period_start")
        period_end = data.get("period_end")
        
        # Get public holidays in this period
        holidays = list(mongo.db.holidays.find({
            "date": {"$gte": period_start, "$lte": period_end},
            "type": {"$in": ["public", "company"]}
        }))
        
        holiday_entries = []
        for holiday in holidays:
            holiday_entries.append({
                "date": holiday["date"],
                "entry_type": "holiday",
                "holiday_name": holiday.get("name"),
                "hours": 8.0,  # Standard working hours
                "description": f"Public Holiday: {holiday.get('name')}"
            })
        
        return jsonify({
            "holidays": holiday_entries,
            "count": len(holiday_entries)
        }), 200
        
    except Exception as e:
        print(f"❌ Error populating holidays: {str(e)}")
        return jsonify({"error": str(e)}), 500