from flask import Blueprint, jsonify, request
from datetime import datetime

from config.db import get_db
from utils.json import to_jsonable
from utils.validators import require_fields

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/login")
def login():
    """Login using userId + password + role.

    Frontend sends:
    {
      "userId": "...",
      "password": "...",
      "role": "admin"|"answerer"
    }

    Returns:
    {
      "user": {"id","userId","name","email","role"}
    }
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId", "password", "role"])
    if not ok:
        return jsonify({"error": msg}), 400

    userId = str(payload["userId"]).strip()
    password = str(payload["password"]).strip()
    role = str(payload["role"]).strip()

    db = get_db()
    user = db.users.find_one({"userId": userId, "role": role})
    if not user:
        return jsonify({"error": "Invalid userId/role"}), 401

    # Plain-text password (as you requested earlier). Not recommended for production.
    if user.get("password") != password:
        return jsonify({"error": "Invalid password"}), 401

    # Update lastLogin
    db.users.update_one({"_id": user["_id"]}, {"$set": {"lastLoginAt": datetime.utcnow()}})

    res_user = {
        "id": str(user["_id"]),
        "userId": user.get("userId"),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
    }
    return jsonify({"user": to_jsonable(res_user)})

@auth_bp.post("/change-password")
def change_password():
    """
    Payload:
    {
      "userId": "...",
      "oldPassword": "...",
      "newPassword": "...",
      "role": "admin" | "answerer"
    }
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId", "oldPassword", "newPassword", "role"])
    if not ok:
        return jsonify({"error": msg}), 400

    userId = str(payload["userId"]).strip()
    old_password = str(payload["oldPassword"]).strip()
    new_password = str(payload["newPassword"]).strip()
    role = str(payload["role"]).strip()

    if old_password == new_password:
        return jsonify({"error": "New password cannot be same as old password"}), 400

    db = get_db()
    user = db.users.find_one({"userId": userId, "role": role})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("password") != old_password:
        return jsonify({"error": "Old password is incorrect"}), 401

    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password": new_password,
                "passwordUpdatedAt": datetime.utcnow()
            }
        }
    )

    return jsonify({"message": "Password updated successfully"})