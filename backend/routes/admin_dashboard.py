from flask import Blueprint, jsonify
from config.db import get_db

admin_dashboard_bp = Blueprint("admin_dashboard", __name__)

@admin_dashboard_bp.route("/dashboard-stats", methods=["GET"])
def dashboard_stats():
    db = get_db()

    total_users = db.users.count_documents({"role": "answerer"})
    active_tests = db.exams.count_documents({"status": "active"})
    completed_tests = db.exams.count_documents({"status": "completed"})

    return jsonify({
        "totalUsers": total_users,
        "activeTests": active_tests,
        "completedTests": completed_tests
    })
