# routes/charge_code_routes.py
from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from config.db import mongo

charge_code_bp = Blueprint("charge_code_bp", __name__)


def serialize_charge_code(cc):
    """Helper to serialize charge code documents"""
    if not cc:
        return None
    
    cc["_id"] = str(cc["_id"])
    
    if "created_by" in cc and isinstance(cc["created_by"], ObjectId):
        cc["created_by"] = str(cc["created_by"])
    
    datetime_fields = ["created_at", "updated_at", "start_date", "end_date"]
    for field in datetime_fields:
        if field in cc and isinstance(cc[field], datetime):
            cc[field] = cc[field].isoformat()
    
    return cc


def serialize_assignment(assignment):
    """Helper to serialize charge code assignment"""
    if not assignment:
        return None
    
    assignment["_id"] = str(assignment["_id"])
    assignment["employee_id"] = str(assignment["employee_id"])
    assignment["charge_code_id"] = str(assignment["charge_code_id"])
    
    if "assigned_by" in assignment and isinstance(assignment["assigned_by"], ObjectId):
        assignment["assigned_by"] = str(assignment["assigned_by"])
    
    datetime_fields = ["assigned_at", "start_date", "end_date"]
    for field in datetime_fields:
        if field in assignment and isinstance(assignment[field], datetime):
            assignment[field] = assignment[field].isoformat()
    
    return assignment


# ========================================
# CREATE CHARGE CODE (ADMIN)
# ========================================
@charge_code_bp.route("/create", methods=["POST"])
def create_charge_code():
    """
    Create a new charge code (admin only)
    Body: {
        code: str (e.g., "PROJ-001"),
        name: str,
        description: str,
        project_name: str (optional),
        is_active: bool,
        created_by: str (user_id)
    }
    """
    try:
        data = request.get_json()
        code = data.get("code", "").strip().upper()
        name = data.get("name", "").strip()
        description = data.get("description", "")
        project_name = data.get("project_name", "")
        is_active = data.get("is_active", True)
        created_by = data.get("created_by")
        
        if not all([code, name, created_by]):
            return jsonify({"error": "Code, name, and created_by are required"}), 400
        
        # Check if code already exists
        existing = mongo.db.charge_codes.find_one({"code": code})
        if existing:
            return jsonify({"error": f"Charge code {code} already exists"}), 400
        
        # Create charge code
        charge_code = {
            "code": code,
            "name": name,
            "description": description,
            "project_name": project_name,
            "is_active": is_active,
            "created_by": ObjectId(created_by),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = mongo.db.charge_codes.insert_one(charge_code)
        
        return jsonify({
            "message": "Charge code created successfully",
            "charge_code_id": str(result.inserted_id),
            "code": code
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating charge code: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# GET ALL CHARGE CODES
# ========================================
@charge_code_bp.route("/all", methods=["GET"])
def get_all_charge_codes():
    """Get all charge codes"""
    try:
        # Optional filter for active only
        active_only = request.args.get("active_only", "false").lower() == "true"
        
        query = {}
        if active_only:
            query["is_active"] = True
        
        charge_codes = list(mongo.db.charge_codes.find(query).sort("code", 1))
        
        return jsonify([serialize_charge_code(cc) for cc in charge_codes]), 200
        
    except Exception as e:
        print(f"❌ Error fetching charge codes: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# UPDATE CHARGE CODE
# ========================================
@charge_code_bp.route("/update/<charge_code_id>", methods=["PUT"])
def update_charge_code(charge_code_id):
    """
    Update charge code
    Body: {
        name: str,
        description: str,
        project_name: str,
        is_active: bool
    }
    """
    try:
        data = request.get_json()
        
        charge_code = mongo.db.charge_codes.find_one({"_id": ObjectId(charge_code_id)})
        if not charge_code:
            return jsonify({"error": "Charge code not found"}), 404
        
        update_data = {
            "updated_at": datetime.utcnow()
        }
        
        if "name" in data:
            update_data["name"] = data["name"].strip()
        if "description" in data:
            update_data["description"] = data["description"]
        if "project_name" in data:
            update_data["project_name"] = data["project_name"]
        if "is_active" in data:
            update_data["is_active"] = bool(data["is_active"])
        
        mongo.db.charge_codes.update_one(
            {"_id": ObjectId(charge_code_id)},
            {"$set": update_data}
        )
        
        return jsonify({"message": "Charge code updated successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error updating charge code: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# DELETE CHARGE CODE
# ========================================
@charge_code_bp.route("/delete/<charge_code_id>", methods=["DELETE"])
def delete_charge_code(charge_code_id):
    """
    Delete a charge code
    """
    try:
        # Check if charge code is in use
        in_use = mongo.db.charge_code_assignments.find_one({
            "charge_code_id": ObjectId(charge_code_id),
            "is_active": True
        })
        
        if in_use:
            return jsonify({
                "error": "Cannot delete charge code that is currently assigned to employees"
            }), 400
        
        result = mongo.db.charge_codes.delete_one({"_id": ObjectId(charge_code_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Charge code not found"}), 404
        
        return jsonify({"message": "Charge code deleted successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error deleting charge code: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# ASSIGN CHARGE CODE TO EMPLOYEE
# ========================================
@charge_code_bp.route("/assign", methods=["POST"])
def assign_charge_code():
    """
    Assign charge code(s) to employee
    Body: {
        employee_id: str,
        charge_code_ids: [str],  # Array of charge code IDs
        assigned_by: str (user_id),
        start_date: "YYYY-MM-DD" (optional),
        end_date: "YYYY-MM-DD" (optional)
    }
    """
    try:
        data = request.get_json()
        employee_id = data.get("employee_id")
        charge_code_ids = data.get("charge_code_ids", [])
        assigned_by = data.get("assigned_by")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        
        if not all([employee_id, charge_code_ids, assigned_by]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Verify employee exists
        employee = mongo.db.users.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            return jsonify({"error": "Employee not found"}), 404
        
        # Verify admin/manager
        admin = mongo.db.users.find_one({"_id": ObjectId(assigned_by)})
        if not admin or admin.get("role") not in ["Admin", "Manager"]:
            return jsonify({"error": "Only admins/managers can assign charge codes"}), 403
        
        assigned_codes = []
        
        for cc_id in charge_code_ids:
            # Verify charge code exists
            charge_code = mongo.db.charge_codes.find_one({"_id": ObjectId(cc_id)})
            if not charge_code:
                continue
            
            # Check if already assigned
            existing = mongo.db.charge_code_assignments.find_one({
                "employee_id": ObjectId(employee_id),
                "charge_code_id": ObjectId(cc_id),
                "is_active": True
            })
            
            if existing:
                continue  # Skip already assigned codes
            
            # Create assignment
            assignment = {
                "employee_id": ObjectId(employee_id),
                "employee_name": employee.get("name"),
                "charge_code_id": ObjectId(cc_id),
                "charge_code": charge_code.get("code"),
                "charge_code_name": charge_code.get("name"),
                "assigned_by": ObjectId(assigned_by),
                "assigned_at": datetime.utcnow(),
                "is_active": True
            }
            
            if start_date:
                assignment["start_date"] = start_date
            if end_date:
                assignment["end_date"] = end_date
            
            result = mongo.db.charge_code_assignments.insert_one(assignment)
            assigned_codes.append({
                "assignment_id": str(result.inserted_id),
                "code": charge_code.get("code")
            })
        
        return jsonify({
            "message": f"Assigned {len(assigned_codes)} charge code(s) successfully",
            "assignments": assigned_codes
        }), 201
        
    except Exception as e:
        print(f"❌ Error assigning charge code: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# GET EMPLOYEE'S ASSIGNED CHARGE CODES
# ========================================
@charge_code_bp.route("/employee/<employee_id>", methods=["GET"])
def get_employee_charge_codes(employee_id):
    """Get all charge codes assigned to an employee"""
    try:
        # Get active assignments only by default
        active_only = request.args.get("active_only", "true").lower() == "true"
        
        query = {"employee_id": ObjectId(employee_id)}
        if active_only:
            query["is_active"] = True
        
        assignments = list(mongo.db.charge_code_assignments.find(query))
        
        # Enrich with charge code details
        enriched = []
        for assignment in assignments:
            charge_code = mongo.db.charge_codes.find_one({
                "_id": assignment["charge_code_id"]
            })
            
            if charge_code:
                enriched_assignment = serialize_assignment(assignment)
                enriched_assignment["charge_code_details"] = serialize_charge_code(charge_code)
                enriched.append(enriched_assignment)
        
        return jsonify(enriched), 200
        
    except Exception as e:
        print(f"❌ Error fetching employee charge codes: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# GET ALL ASSIGNMENTS (ADMIN)
# ========================================
@charge_code_bp.route("/assignments/all", methods=["GET"])
def get_all_assignments():
    """Get all charge code assignments (admin view)"""
    try:
        assignments = list(mongo.db.charge_code_assignments.find().sort("assigned_at", -1))
        
        return jsonify([serialize_assignment(a) for a in assignments]), 200
        
    except Exception as e:
        print(f"❌ Error fetching all assignments: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# REMOVE CHARGE CODE FROM EMPLOYEE
# ========================================
@charge_code_bp.route("/remove/<assignment_id>", methods=["DELETE"])
def remove_charge_code_assignment(assignment_id):
    """
    Remove charge code assignment from employee
    """
    try:
        assignment = mongo.db.charge_code_assignments.find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            return jsonify({"error": "Assignment not found"}), 404
        
        # Soft delete - mark as inactive
        mongo.db.charge_code_assignments.update_one(
            {"_id": ObjectId(assignment_id)},
            {"$set": {"is_active": False, "removed_at": datetime.utcnow()}}
        )
        
        return jsonify({"message": "Charge code assignment removed successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error removing assignment: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# BULK ASSIGN CHARGE CODES
# ========================================
@charge_code_bp.route("/bulk_assign", methods=["POST"])
def bulk_assign_charge_codes():
    """
    Bulk assign same charge code(s) to multiple employees
    Body: {
        employee_ids: [str],
        charge_code_ids: [str],
        assigned_by: str (user_id)
    }
    """
    try:
        data = request.get_json()
        employee_ids = data.get("employee_ids", [])
        charge_code_ids = data.get("charge_code_ids", [])
        assigned_by = data.get("assigned_by")
        
        if not all([employee_ids, charge_code_ids, assigned_by]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Verify admin
        admin = mongo.db.users.find_one({"_id": ObjectId(assigned_by)})
        if not admin or admin.get("role") not in ["Admin", "Manager"]:
            return jsonify({"error": "Only admins/managers can assign charge codes"}), 403
        
        total_assigned = 0
        
        for emp_id in employee_ids:
            employee = mongo.db.users.find_one({"_id": ObjectId(emp_id)})
            if not employee:
                continue
            
            for cc_id in charge_code_ids:
                charge_code = mongo.db.charge_codes.find_one({"_id": ObjectId(cc_id)})
                if not charge_code:
                    continue
                
                # Check if already assigned
                existing = mongo.db.charge_code_assignments.find_one({
                    "employee_id": ObjectId(emp_id),
                    "charge_code_id": ObjectId(cc_id),
                    "is_active": True
                })
                
                if existing:
                    continue
                
                # Create assignment
                assignment = {
                    "employee_id": ObjectId(emp_id),
                    "employee_name": employee.get("name"),
                    "charge_code_id": ObjectId(cc_id),
                    "charge_code": charge_code.get("code"),
                    "charge_code_name": charge_code.get("name"),
                    "assigned_by": ObjectId(assigned_by),
                    "assigned_at": datetime.utcnow(),
                    "is_active": True
                }
                
                mongo.db.charge_code_assignments.insert_one(assignment)
                total_assigned += 1
        
        return jsonify({
            "message": f"Bulk assignment completed",
            "total_assigned": total_assigned
        }), 201
        
    except Exception as e:
        print(f"❌ Error in bulk assignment: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500