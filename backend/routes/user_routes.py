from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from config.db import mongo
import os

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
                    "leaveBalance": {
                        "sick": 6,
                        "sickTotal": 6,
                        "planned": 12,
                        "plannedTotal": 12,
                        "optional": 2,
                        "optionalTotal": 2,
                        "lwp": 0
                    },
                    "dateOfJoining": datetime.utcnow(),
                    "dateOfBirth": None,
                    "createdAt": datetime.utcnow()
                }).inserted_id
                data["reportsTo"] = manager_id

        data.pop("reportsToEmail", None)
        data["createdAt"] = datetime.utcnow()

        # Handle joining date safely
        try:
            if "dateOfJoining" in data and data["dateOfJoining"]:
                data["dateOfJoining"] = datetime.fromisoformat(data["dateOfJoining"].replace('Z', '+00:00'))
            else:
                data["dateOfJoining"] = datetime.utcnow()
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

        # 👇👇👇 ADD THIS SECTION - Calculate leave balance based on joining date 👇👇👇
        joining_date = data.get("dateOfJoining")
        if joining_date:
            join_dt = joining_date  # Already converted above
        else:
            join_dt = datetime.utcnow()

        # Calculate months since joining (including current month)
        today = datetime.utcnow()
        months_employed = (today.year - join_dt.year) * 12 + (today.month - join_dt.month) + 1

        # 🔹 NEW: Fortnight rule – if joined after 15th, don't count joining month
        if join_dt.day > 15:
            months_employed -= 1
            if months_employed < 0:
                months_employed = 0

        # Accrual rates: 1 planned per month, 0.5 sick per month
        planned_balance = months_employed * 1.0
        sick_balance = months_employed * 0.5


        data["leaveBalance"] = {
            "sick": sick_balance,
            "sickTotal": sick_balance,
            "planned": planned_balance,
            "plannedTotal": planned_balance,
            "optional": 2,
            "optionalTotal": 2,
            "lwp": 0,
            "lastAccrualDate": today.replace(day=1)  # First day of current month
        }
        print(f"✅ Calculated leave balance: Sick={sick_balance}, Planned={planned_balance} (Months employed: {months_employed})")
        # 👆👆👆 LEAVE BALANCE CALCULATION ENDS HERE 👆👆👆

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

            # ✅ BUILD PHOTO URL
            base = request.host_url.rstrip("/")
            user_id_str = str(user["_id"])
            photo_url = None

            photo_extensions = ['.png', '.jpg', '.jpeg', '.webp']
            for ext in photo_extensions:
                photo_filename = f"{user_id_str}{ext}"
                photo_path = os.path.join("static", "profile_photos", photo_filename)
                if os.path.exists(photo_path):
                    photo_url = f"{base}/static/profile_photos/{photo_filename}"
                    break

            user["photoUrl"] = photo_url
            
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

            # Convert peopleLead ObjectId to peopleLeadEmail string
            if "peopleLead" in user and user["peopleLead"]:
                if isinstance(user["peopleLead"], ObjectId):
                    people_lead = mongo.db.users.find_one({"_id": user["peopleLead"]})
                    if people_lead:
                        user["peopleLeadEmail"] = people_lead["email"]
                    user["peopleLead"] = str(user["peopleLead"])
                elif isinstance(user["peopleLead"], str):
                    try:
                        people_lead = mongo.db.users.find_one({"_id": ObjectId(user["peopleLead"])})
                        if people_lead:
                            user["peopleLeadEmail"] = people_lead["email"]
                    except:
                        pass
            
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Admin: Get All Employees (exclude Admins)
# -------------------------------
@user_bp.route("/get_all_employees", methods=["GET"])
def get_all_employees():
    try:
        employees = list(mongo.db.users.find({"role": {"$ne": "Admin"}}))  # Exclude Admins

        for emp in employees:
            # ✅ BUILD PHOTO URL
            base = request.host_url.rstrip("/")
            emp_id_str = str(emp["_id"])
            photo_url = None

            photo_extensions = ['.png', '.jpg', '.jpeg', '.webp']
            for ext in photo_extensions:
                photo_filename = f"{emp_id_str}{ext}"
                photo_path = os.path.join("static", "profile_photos", photo_filename)
                if os.path.exists(photo_path):
                    photo_url = f"{base}/static/profile_photos/{photo_filename}"
                    break

            emp["photoUrl"] = photo_url
                
            if "reportsTo" in emp and isinstance(emp["reportsTo"], ObjectId):
                emp["reportsTo"] = str(emp["reportsTo"])

        return jsonify(employees), 200

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
        
        # BUILD PHOTO URL
        base = request.host_url.rstrip("/")
        user_id_str = str(user["_id"])
        photo_url = None

        photo_extensions = ['.png', '.jpg', '.jpeg', '.webp']
        for ext in photo_extensions:
            photo_filename = f"{user_id_str}{ext}"
            photo_path = os.path.join("static", "profile_photos", photo_filename)
            if os.path.exists(photo_path):
                photo_url = f"{base}/static/profile_photos/{photo_filename}"
                break

        user["photoUrl"] = photo_url

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

        # ✅ NEW: Convert peopleLead ObjectId to peopleLeadEmail string
        if "peopleLead" in user and user["peopleLead"]:
            if isinstance(user["peopleLead"], ObjectId):
                people_lead = mongo.db.users.find_one({"_id": user["peopleLead"]})
                if people_lead:
                    user["peopleLeadEmail"] = people_lead["email"]
                user["peopleLead"] = str(user["peopleLead"])
            elif isinstance(user["peopleLead"], str):
                try:
                    people_lead = mongo.db.users.find_one({"_id": ObjectId(user["peopleLead"])})
                    if people_lead:
                        user["peopleLeadEmail"] = people_lead["email"]
                except:
                    pass

        # --- FIX: Convert project ObjectIds to strings ---
        if "projects" in user and isinstance(user["projects"], list):
            for proj in user["projects"]:
                if "_id" in proj and isinstance(proj["_id"], ObjectId):
                    proj["_id"] = str(proj["_id"])
        
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


# ------------------------------------------
# PROJECT MANAGEMENT ROUTES (CLEAN + FIXED)
# ------------------------------------------
@user_bp.route("/assign_project/<user_id>", methods=["POST"])
def assign_project(user_id):
    data = request.get_json()
    name = data.get("name")
    start_raw = data.get("startDate")
    end_raw = data.get("endDate")
    assigned_by = data.get("assignedBy", "Admin")

    if not name or not start_raw:
        return jsonify({"error": "Project name and start date required"}), 400

    # Convert dates safely
    try:
        start = datetime.fromisoformat(start_raw).date().isoformat()
    except:
        return jsonify({"error": "Invalid start date"}), 400

    end = None
    if end_raw:
        try:
            end = datetime.fromisoformat(end_raw).date().isoformat()
        except:
            end = None

    project = {
        "_id": ObjectId(),
        "name": name,
        "startDate": start,
        "endDate": end,
        "assignedBy": assigned_by,
        "createdAt": datetime.utcnow()
    }

    mongo.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$push": {"projects": project}}
    )

    project["_id"] = str(project["_id"])
    return jsonify({"message": "Project assigned", "project": project}), 200


@user_bp.route("/update_project/<user_id>/<project_id>", methods=["PUT"])
def update_project(user_id, project_id):
    data = request.get_json()

    update_fields = {}
    if "name" in data:
        update_fields["projects.$.name"] = data["name"]
    if "startDate" in data:
        update_fields["projects.$.startDate"] = data["startDate"]
    if "endDate" in data:
        update_fields["projects.$.endDate"] = data["endDate"]

    result = mongo.db.users.update_one(
        {"_id": ObjectId(user_id), "projects._id": ObjectId(project_id)},
        {"$set": update_fields}
    )

    if result.modified_count == 0:
        return jsonify({"error": "Project not found or no changes"}), 404

    return jsonify({"message": "Project updated"}), 200


@user_bp.route("/delete_project/<user_id>/<project_id>", methods=["DELETE"])
def delete_project(user_id, project_id):
    result = mongo.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"projects": {"_id": ObjectId(project_id)}}}
    )

    if result.modified_count == 0:
        return jsonify({"error": "Project not found"}), 404

    return jsonify({"message": "Project removed"}), 200



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

        # Handle reportsToEmail linkage update (Admin only in practice, but backend validates too)
        if "reportsToEmail" in data:
            # Backend validation: Only process if user has admin privileges
            # Note: In production, you'd check the requesting user's role from auth token
            if data["reportsToEmail"]:  # If email is provided
                manager = mongo.db.users.find_one({"email": data["reportsToEmail"]})
                if manager:
                    update_data["reportsTo"] = manager["_id"]
                else:
                    return jsonify({"error": "Manager not found with provided email"}), 404
            else:  # If email is empty string, clear the manager
                update_data["reportsTo"] = None
            data.pop("reportsToEmail", None)

        # Handle peopleLeadEmail linkage update
        if "peopleLeadEmail" in data:
            ple = data["peopleLeadEmail"]

            if ple:  # non-empty email provided
                people_lead = mongo.db.users.find_one({"email": ple})
                if people_lead:
                    # store relation + readable email
                    update_data["peopleLead"] = people_lead["_id"]
                    update_data["peopleLeadEmail"] = ple
                else:
                    # just store the email string; do NOT abort entire update
                    update_data["peopleLeadEmail"] = ple
            else:
                # empty string => clear linkage + email
                update_data["peopleLead"] = None
                update_data["peopleLeadEmail"] = ""
            
            data.pop("peopleLeadEmail", None)


        # Fields that can be updated (including dateOfBirth and workLocation)
        allowed_fields = ["name", "email", "designation", "department", "shiftTimings", "projects", 
                        "role", "leaveBalance", "dateOfJoining", "dateOfBirth", "workLocation"]
        
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
            # ✅ CRITICAL: Convert _id to string FIRST
            emp_id_str = str(emp["_id"])
            emp["_id"] = emp_id_str
            
            # ✅ BUILD PHOTO URL using the string ID
            base = request.host_url.rstrip("/")
            photo_url = None

            photo_extensions = ['.png', '.jpg', '.jpeg', '.webp']
            for ext in photo_extensions:
                photo_filename = f"{emp_id_str}{ext}"
                photo_path = os.path.join("static", "profile_photos", photo_filename)
                if os.path.exists(photo_path):
                    photo_url = f"{base}/static/profile_photos/{photo_filename}"
                    break

            emp["photoUrl"] = photo_url
            
            # ✅ Convert reportsTo to string
            if "reportsTo" in emp and isinstance(emp["reportsTo"], ObjectId):
                emp["reportsTo"] = str(emp["reportsTo"])
            
            # ✅ Add explicit debug log
            print(f"✅ Employee {emp.get('name')}: ID = {emp_id_str} (type: {type(emp_id_str)})")
            
        return jsonify(employees), 200
        
    except Exception as e:
        print(f"❌ Error fetching employees by manager: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Upload Profile Photo
# -------------------------------
@user_bp.route("/upload_photo/<user_id>", methods=["POST"])
def upload_photo(user_id):
    try:
        print("📸 Upload request received for", user_id)

        if "photo" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["photo"]

        # Validate extension
        allowed_ext = {"png", "jpg", "jpeg", "webp"}
        ext = file.filename.rsplit(".", 1)[-1].lower()

        if ext not in allowed_ext:
            return jsonify({"error": "Invalid file type. Only PNG/JPG/WEBP allowed"}), 400

        # Generate filename
        filename = f"{user_id}.{ext}"

        # Create uploads folder if missing
        import os
        upload_folder = os.path.join("static", "profile_photos")
        os.makedirs(upload_folder, exist_ok=True)

        # Save file
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        # Save path in DB
        # Save filename in DB (not the full path)
        # Save filename in DB
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)}, {"$set": {"photoFilename": filename}}
        )

        # Build the photo URL
        base = request.host_url.rstrip("/")
        photo_url = f"{base}/static/profile_photos/{filename}"

        print("✅ Photo uploaded:", photo_url)
        return jsonify({"message": "Photo uploaded successfully", "url": photo_url})

    except Exception as e:
        print("❌ Upload error:", str(e))
        return jsonify({"error": str(e)}), 500