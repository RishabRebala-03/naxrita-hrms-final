from flask import Blueprint, jsonify, request
from datetime import datetime
from bson import ObjectId

from config.db import get_db
from utils.json import to_jsonable
from utils.validators import require_fields
from services.scoring import compute_result

answerer_bp = Blueprint("answerer", __name__)

@answerer_bp.get("/dashboard")
def dashboard():
    """Return answerer insights.

    Query param: userId
    """
    userId = (request.args.get("userId") or "").strip()
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    # Use results collection for insights
    results = list(db.results.find({"userId": userId}))
    testsTaken = len(results)
    testsPassed = sum(1 for r in results if r.get("passed") is True)
    bestScore = max([float(r.get("percentage", 0.0)) for r in results], default=0.0)
    avgScore = round(sum([float(r.get("percentage", 0.0)) for r in results]) / testsTaken, 2) if testsTaken else 0.0

    # Simple streak: consecutive passes from most recent backwards
    results_sorted = sorted(results, key=lambda r: r.get("submittedAt") or datetime.min, reverse=True)
    streak = 0
    for r in results_sorted:
        if r.get("passed") is True:
            streak += 1
        else:
            break

    return jsonify({
        "insights": {
            "testsTaken": testsTaken,
            "testsPassed": testsPassed,
            "avgScore": avgScore,
            "bestScore": bestScore,
            "streak": streak,
        }
    })


@answerer_bp.get("/tests")
def list_assigned_tests():
    """List tests assigned to a user.

    Query param: userId
    """
    userId = (request.args.get("userId") or "").strip()
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    assignments = list(db.exam_assignments.find({"userId": userId}))
    exam_ids = [a.get("examId") for a in assignments if a.get("examId")]

    exams = list(db.exams.find({"_id": {"$in": exam_ids}})) if exam_ids else []

    out = []
    for e in exams:
        # Get questions to calculate total marks and determine question types
        qs = list(db.questions.find({"examId": e["_id"]}))
        
        # Calculate total marks from actual questions
        total_marks = sum(int(q.get("marks", 1)) for q in qs) if qs else int(e.get("questionCount", 0))
        
        # Determine question types
        question_types = set()
        for q in qs:
            qtype = q.get("type", "")
            if qtype == "mcq":
                question_types.add("MCQ")
            elif qtype == "multiple":
                question_types.add("Multiple Choice")
            elif qtype == "text":
                question_types.add("Text")
        
        question_types_str = ", ".join(sorted(question_types)) if question_types else "Mixed"
        
        out.append({
            "id": str(e["_id"]),
            "name": e.get("name"),
            "duration": int(e.get("duration", 0)),
            "questions": int(e.get("questionCount", 0)),
            "sections": e.get("sections", []),
            "status": e.get("status", "draft"),
            "totalMarks": total_marks,
            "passingPercentage": 40,
            "questionTypes": question_types_str,
        })

    return jsonify({"tests": to_jsonable(out)})


@answerer_bp.get("/tests/<exam_id>")
def get_test_for_taker(exam_id: str):
    """Return exam + questions for taking the test.

    Query param: userId (optional - if you want to validate assignment)
    
    IMPORTANT: we do NOT send correctAnswer to the test taker.
    """
    userId = (request.args.get("userId") or "").strip()

    db = get_db()
    try:
        oid = ObjectId(exam_id)
    except Exception:
        return jsonify({"error": "Invalid exam id"}), 400

    exam = db.exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    if userId:
        assigned = db.exam_assignments.find_one({"examId": oid, "userId": userId})
        if not assigned:
            return jsonify({"error": "Exam not assigned to this user"}), 403

    qs = list(db.questions.find({"examId": oid}))
    
    # Calculate total marks and question types
    total_marks = sum(int(q.get("marks", 1)) for q in qs) if qs else int(exam.get("questionCount", 0))
    
    question_types = set()
    for q in qs:
        qtype = q.get("type", "")
        if qtype == "mcq":
            question_types.add("MCQ")
        elif qtype == "multiple":
            question_types.add("Multiple Choice")
        elif qtype == "text":
            question_types.add("Text")
    
    question_types_str = ", ".join(sorted(question_types)) if question_types else "Mixed"
    
    out_questions = []
    for q in qs:
        out_questions.append({
            "id": str(q.get("qid") or q.get("_id")),
            "type": q.get("type"),
            "question": q.get("question"),
            "options": q.get("options", []),
            "section": q.get("section"),
            "marks": int(q.get("marks", 0)),
        })

    return jsonify({
        "test": to_jsonable({
            "id": str(exam["_id"]),
            "testName": exam.get("name"),
            "duration": int(exam.get("duration", 0)),
            "sections": exam.get("sections", []),
            "questions": out_questions,
            "totalMarks": total_marks,
            "passingPercentage": 40,
            "questionTypes": question_types_str,
        })
    })


@answerer_bp.post("/attempts/start")
def start_attempt():
    """Create an attempt document.

    Payload: {"userId", "examId"}
    Returns: {"attemptId"}
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId", "examId"])
    if not ok:
        return jsonify({"error": msg}), 400

    db = get_db()
    userId = str(payload["userId"]).strip()
    try:
        exam_oid = ObjectId(payload["examId"])
    except Exception:
        return jsonify({"error": "Invalid examId"}), 400

    # verify assignment
    if not db.exam_assignments.find_one({"examId": exam_oid, "userId": userId}):
        return jsonify({"error": "Exam not assigned"}), 403

    # If there's an in-progress attempt, return it
    existing = db.attempts.find_one({"examId": exam_oid, "userId": userId, "status": "in_progress"})
    if existing:
        return jsonify({"attemptId": str(existing["_id"])})

    now = datetime.utcnow()
    attempt_doc = {
        "examId": exam_oid,
        "userId": userId,
        "status": "in_progress",
        "answers": [],
        "startedAt": now,
        "updatedAt": now,
        "submittedAt": None,
        "timeSpentSec": 0,
    }
    res = db.attempts.insert_one(attempt_doc)
    return jsonify({"attemptId": str(res.inserted_id)})


@answerer_bp.put("/attempts/<attempt_id>/save")
def save_attempt(attempt_id: str):
    """Save answers while test is in progress.

    Payload: {"answers": [...], "timeSpentSec": 123}
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["answers"])
    if not ok:
        return jsonify({"error": msg}), 400

    db = get_db()
    try:
        oid = ObjectId(attempt_id)
    except Exception:
        return jsonify({"error": "Invalid attempt id"}), 400

    attempt = db.attempts.find_one({"_id": oid})
    if not attempt:
        return jsonify({"error": "Attempt not found"}), 404
    if attempt.get("status") != "in_progress":
        return jsonify({"error": "Attempt not in progress"}), 400

    update = {
        "answers": payload.get("answers") or [],
        "updatedAt": datetime.utcnow(),
    }
    if payload.get("timeSpentSec") is not None:
        update["timeSpentSec"] = int(payload.get("timeSpentSec") or 0)

    db.attempts.update_one({"_id": oid}, {"$set": update})
    return jsonify({"message": "Saved"})


@answerer_bp.post("/attempts/<attempt_id>/submit")
def submit_attempt(attempt_id: str):
    """Submit an attempt, compute result, store in results.

    Payload: {"answers": [...], "timeSpentSec": 123}
    Returns: {"result": {...}}
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["answers"])
    if not ok:
        return jsonify({"error": msg}), 400

    db = get_db()
    try:
        oid = ObjectId(attempt_id)
    except Exception:
        return jsonify({"error": "Invalid attempt id"}), 400

    attempt = db.attempts.find_one({"_id": oid})
    if not attempt:
        return jsonify({"error": "Attempt not found"}), 404

    if attempt.get("status") == "submitted":
        # return existing result
        existing_res = db.results.find_one({"attemptId": oid})
        if existing_res:
            existing_res["id"] = str(existing_res["_id"])
            existing_res["attemptId"] = str(existing_res.get("attemptId"))
            existing_res["examId"] = str(existing_res.get("examId"))
            del existing_res["_id"]
            return jsonify({"result": to_jsonable(existing_res)})

    exam_oid = attempt.get("examId")
    userId = attempt.get("userId")

    qs = list(db.questions.find({"examId": exam_oid}))
    # convert question docs for scorer
    q_for_scoring = []
    for q in qs:
        q_for_scoring.append({
            "_id": q.get("_id"),
            "id": str(q.get("qid") or q.get("_id")),
            "type": q.get("type"),
            "question": q.get("question"),
            "options": q.get("options", []),
            "correctAnswer": q.get("correctAnswer"),
            "section": q.get("section"),
            "marks": int(q.get("marks", 0)),
        })

    result_calc = compute_result(q_for_scoring, payload.get("answers") or [], passing_percent=40.0)

    now = datetime.utcnow()

    db.attempts.update_one(
        {"_id": oid},
        {"$set": {
            "status": "submitted",
            "answers": payload.get("answers") or [],
            "submittedAt": now,
            "updatedAt": now,
            "timeSpentSec": int(payload.get("timeSpentSec") or attempt.get("timeSpentSec") or 0),
        }},
    )

    # upsert result
    res_doc = {
        "attemptId": oid,
        "examId": exam_oid,
        "userId": userId,
        "totalMarks": result_calc["totalMarks"],
        "scoredMarks": result_calc["scoredMarks"],
        "percentage": result_calc["percentage"],
        "passed": result_calc["passed"],
        "passingPercent": result_calc["passingPercent"],
        "sectionBreakdown": result_calc["sectionBreakdown"],
        "review": result_calc["review"],
        "submittedAt": now,
        "createdAt": now,
    }

    existing = db.results.find_one({"attemptId": oid})
    if existing:
        db.results.update_one({"_id": existing["_id"]}, {"$set": res_doc})
        res_id = existing["_id"]
    else:
        res_ins = db.results.insert_one(res_doc)
        res_id = res_ins.inserted_id

    res_doc_out = {**res_doc, "id": str(res_id), "attemptId": str(oid), "examId": str(exam_oid)}
    # attemptId/examId already string, remove objectids in payload
    return jsonify({"result": to_jsonable(res_doc_out)})


@answerer_bp.get("/results/<attempt_id>")
def get_result(attempt_id: str):
    db = get_db()
    try:
        oid = ObjectId(attempt_id)
    except Exception:
        return jsonify({"error": "Invalid attempt id"}), 400

    res = db.results.find_one({"attemptId": oid})
    if not res:
        return jsonify({"error": "Result not found"}), 404

    out = {**res}
    out["id"] = str(out.pop("_id"))
    out["attemptId"] = str(out.get("attemptId"))
    out["examId"] = str(out.get("examId"))

    return jsonify({"result": to_jsonable(out)})