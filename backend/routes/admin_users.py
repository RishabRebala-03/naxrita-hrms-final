from flask import Blueprint, jsonify, request
from datetime import datetime
from bson import ObjectId

from config.db import get_db
from utils.json import to_jsonable
from utils.validators import require_fields

admin_users_bp = Blueprint("admin_users", __name__)

# =========================
# LIST USERS
# =========================
@admin_users_bp.route("", methods=["GET"])
@admin_users_bp.route("/", methods=["GET"])
def list_users():
    db = get_db()
    users = list(db.users.find({"role": "answerer"}, {"password": 0}))
    out = []
    for u in users:
        out.append({
            "id": str(u["_id"]),
            "name": u.get("name"),
            "email": u.get("email"),
            "userId": u.get("userId"),
            "role": u.get("role"),
            "createdAt": u.get("createdAt"),
        })
    return jsonify({"users": to_jsonable(out)})


# =========================
# CREATE USER
# =========================
@admin_users_bp.route("", methods=["POST"])
@admin_users_bp.route("/", methods=["POST"])
def create_user():
    payload = request.get_json(silent=True) or {}
    print("CREATE USER PAYLOAD:", payload)

    ok, msg = require_fields(payload, ["name", "email", "userId", "password"])
    if not ok:
        return jsonify({"error": msg}), 400

    db = get_db()
    userId = str(payload["userId"]).strip()

    if db.users.find_one({"userId": userId}):
        return jsonify({"error": "userId already exists"}), 409

    doc = {
        "name": payload["name"].strip(),
        "email": payload["email"].strip().lower(),
        "userId": userId,
        "password": str(payload["password"]).strip(),  # plain text (as requested)
        "role": "answerer",
        "createdAt": datetime.utcnow(),
        "lastLoginAt": None,
        "isActive": True,
    }

    res = db.users.insert_one(doc)

    return jsonify({
        "user": to_jsonable({
            "id": str(res.inserted_id),
            "name": doc["name"],
            "email": doc["email"],
            "userId": doc["userId"],
            "role": doc["role"],
            "createdAt": doc["createdAt"],
        })
    }), 201


# =========================
# DELETE USER
# =========================
@admin_users_bp.route("/<user_id>", methods=["DELETE"])
@admin_users_bp.route("/<user_id>/", methods=["DELETE"])
def delete_user(user_id: str):
    db = get_db()

    try:
        q = {"_id": ObjectId(user_id)}
    except Exception:
        q = {"userId": user_id}

    user = db.users.find_one(q)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.users.delete_one({"_id": user["_id"]})
    db.exam_assignments.delete_many({"userId": user.get("userId")})
    db.attempts.delete_many({"userId": user.get("userId")})

    return jsonify({"message": "Deleted"})