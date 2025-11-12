from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from config.db import mongo

user_bp = Blueprint("user_bp", __name__)

@user_bp.route("/add_user", methods=["POST"])
def add_user():
    try:
        data = request.get_json()
        print("\n📩 Received data:", data)

        # ✅ Ensure employeeId is provided
        if not data.get("employeeId"):
            return jsonify({"error": "employeeId is required"}), 400

        # ✅ Check if employeeId already exists
        existing = mongo.db.users.find_one({"employeeId": data["employeeId"]})
        if existing:
            return jsonify({"error": "Employee ID already exists"}), 400

        reports_to_email = data.get("reportsToEmail")

        # Manager linkage logic
        if reports_to_email:
            manager = mongo.db.users.find_one({"email": reports_to_email})
            if manager:
                data["reportsTo"] = manager["_id"]
            else:
                print(f"⚠️ Manager {reports_to_email} not found, auto-creating...")
                manager_id = mongo.db.users.insert_one({
                    "employeeId": f"AUTO-MGR-{int(datetime.utcnow().timestamp())}",
                    "name": reports_to_email.split("@")[0].capitalize(),
                    "email": reports_to_email,
                    "password": "autocreated",
                    "role": "Manager",
                    "designation": "Auto-created Manager",
                    "department": "General",
                    "shiftTimings": "09:00 - 18:00",
                    "projects": [],
                    "leaveBalance": {"sick": 6, "planned": 12, "lop": 0},
                    "dateOfJoining": datetime.utcnow(),
                    "dateOfBirth": None,  # NEW FIELD
                    "createdAt": datetime.utcnow()
                }).inserted_id
                data["reportsTo"] = manager_id

        data.pop("reportsToEmail", None)
        data["createdAt"] = datetime.utcnow()

        # Handle joining date safely
        try:
            if "dateOfJoining" in data and data["dateOfJoining"]:
                data["dateOfJoining"] = datetime.fromisoformat(data["dateOfJoining"].replace('Z', '+00:00'))
        except Exception:
            data["dateOfJoining"] = datetime.utcnow()

        # NEW FIELD - Handle date of birth safely
        try:
            if "dateOfBirth" in data and data["dateOfBirth"]:
                data["dateOfBirth"] = datetime.fromisoformat(data["dateOfBirth"].replace('Z', '+00:00'))
            else:
                data["dateOfBirth"] = None
        except Exception:
            data["dateOfBirth"] = None

        # ✅ Insert user (employeeId is now required in data)
        mongo.db.users.insert_one(data)
        return jsonify({"message": "User added successfully!", "employeeId": data["employeeId"]}), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Get All Users (Read)
# -------------------------------
@user_bp.route("/", methods=["GET"])
def get_users():
    try:
        users = list(mongo.db.users.find())
        for user in users:
            user["_id"] = str(user["_id"])
            
            # Convert reportsTo ObjectId to reportsToEmail string
            if "reportsTo" in user and user["reportsTo"]:
                if isinstance(user["reportsTo"], ObjectId):
                    # Find the manager and get their email
                    manager = mongo.db.users.find_one({"_id": user["reportsTo"]})
                    if manager:
                        user["reportsToEmail"] = manager["email"]
                    user["reportsTo"] = str(user["reportsTo"])
                elif isinstance(user["reportsTo"], str):
                    # Already converted, find manager by string ID
                    try:
                        manager = mongo.db.users.find_one({"_id": ObjectId(user["reportsTo"])})
                        if manager:
                            user["reportsToEmail"] = manager["email"]
                    except:
                        pass
            
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Get Single User by ID
# -------------------------------
@user_bp.route("/<user_id>", methods=["GET"])
def get_user(user_id):
    try:
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user["_id"] = str(user["_id"])
        
        # Convert reportsTo ObjectId to reportsToEmail string
        if "reportsTo" in user and user["reportsTo"]:
            if isinstance(user["reportsTo"], ObjectId):
                manager = mongo.db.users.find_one({"_id": user["reportsTo"]})
                if manager:
                    user["reportsToEmail"] = manager["email"]
                user["reportsTo"] = str(user["reportsTo"])
            elif isinstance(user["reportsTo"], str):
                try:
                    manager = mongo.db.users.find_one({"_id": ObjectId(user["reportsTo"])})
                    if manager:
                        user["reportsToEmail"] = manager["email"]
                except:
                    pass
        
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Get Manager by Employee ID
# -------------------------------
@user_bp.route("/get_manager/<employee_id>", methods=["GET"])
def get_manager(employee_id):
    try:
        employee = mongo.db.users.find_one({"_id": ObjectId(employee_id)})
        if not employee or "reportsTo" not in employee:
            return jsonify({"error": "Employee or manager not found"}), 404

        manager = mongo.db.users.find_one({"_id": employee["reportsTo"]})
        if not manager:
            return jsonify({"error": "Manager not found"}), 404

        manager["_id"] = str(manager["_id"])
        return jsonify(manager), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Update User (PUT) - MERGED FUNCTION with DOB support
# -------------------------------
@user_bp.route("/update_user/<user_id>", methods=["PUT"])
def update_user(user_id):
    try:
        data = request.get_json()
        print(f"🛠 Updating user {user_id} with data:", data)

        # Check if user exists
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        update_data = {}

        # Handle password change separately with verification
        if "password" in data:
            current_password = data.get("currentPassword")
            
            # If currentPassword is provided, verify it (for user self-service)
            if current_password:
                if user.get("password") != current_password:
                    return jsonify({"error": "Current password is incorrect"}), 400
            
            # Update with new password
            update_data["password"] = data["password"]
            # Don't include currentPassword in update
            data.pop("currentPassword", None)
            data.pop("password", None)

        # Handle reportsToEmail linkage update
        if "reportsToEmail" in data:
            if data["reportsToEmail"]:  # If email is provided
                manager = mongo.db.users.find_one({"email": data["reportsToEmail"]})
                if manager:
                    update_data["reportsTo"] = manager["_id"]
                else:
                    return jsonify({"error": "Manager not found with provided email"}), 404
            else:  # If email is empty string, clear the manager
                update_data["reportsTo"] = None
            data.pop("reportsToEmail", None)

        # Fields that can be updated (including dateOfBirth)
        allowed_fields = ["name", "email", "designation", "department", "shiftTimings", "projects", 
                         "role", "leaveBalance", "dateOfJoining", "dateOfBirth"]
        
        for field in allowed_fields:
            if field in data:
                # Handle date fields specially
                if field in ["dateOfJoining", "dateOfBirth"] and data[field]:
                    try:
                        update_data[field] = datetime.fromisoformat(data[field].replace('Z', '+00:00'))
                    except:
                        update_data[field] = data[field]
                else:
                    update_data[field] = data[field]

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        # If email is being updated, check it's not already taken by another user
        if "email" in update_data and update_data["email"] != user.get("email"):
            existing = mongo.db.users.find_one({
                "email": update_data["email"],
                "_id": {"$ne": ObjectId(user_id)}
            })
            if existing:
                return jsonify({"error": "Email already in use"}), 400

        # Update the user
        result = mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            print(f"✅ User {user_id} updated successfully")
            return jsonify({"message": "User updated successfully"}), 200
        else:
            return jsonify({"message": "No changes made"}), 200

    except Exception as e:
        print(f"❌ Error updating user: {str(e)}")
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Delete User (DELETE)
# -------------------------------
@user_bp.route("/delete_user/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        result = mongo.db.users.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Get Employees under a Manager (by Manager Email)
# -------------------------------
@user_bp.route("/get_employees_by_manager/<manager_email>", methods=["GET"])
def get_employees_by_manager(manager_email):
    try:
        manager = mongo.db.users.find_one({"email": manager_email})
        if not manager:
            return jsonify({"error": "Manager not found"}), 404

        employees = list(mongo.db.users.find({"reportsTo": manager["_id"]}))
        for emp in employees:
            emp["_id"] = str(emp["_id"])
            if "reportsTo" in emp and isinstance(emp["reportsTo"], ObjectId):
                emp["reportsTo"] = str(emp["reportsTo"])
        return jsonify(employees), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500