from flask import Blueprint, request, jsonify
from bson import ObjectId
from config.db import mongo

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Find user by email
        user = mongo.db.users.find_one({"email": email})
        
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        # Check password (plain text comparison - NOT recommended for production)
        if user.get("password") != password:
            return jsonify({"error": "Invalid email or password"}), 401

        # Restrict admin access
        if email == "admin@firm.com":
            if user.get("role") != "Admin":
                return jsonify({"error": "Access denied. This account is not an Admin."}), 403
        else:
            # If it's not the admin email but trying to access admin dashboard
            user_role = user.get("role", "Employee")
            if user_role == "Admin":
                pass  # allowed — maybe future multiple admins
            else:
                # ordinary employee login — fine, but frontend decides where to redirect
                pass

        # Return user info (excluding password)
        user_data = {
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user["email"],
            "role": user.get("role", "Employee"),
            "designation": user.get("designation", ""),
            "department": user.get("department", "")
        }

        return jsonify({
            "message": "Login successful",
            "user": user_data
        }), 200

    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return jsonify({"error": str(e)}), 500