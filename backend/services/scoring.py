from typing import Any, Dict, List


def _normalize_answer(ans):
    if isinstance(ans, list):
        return sorted([str(a).strip() for a in ans])
    if ans is None:
        return ""
    return str(ans).strip()


def compute_result(
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]],
    passing_percent: float = 80.0,
) -> Dict[str, Any]:
    """Compute score + section breakdown + per-question review.

    questions: list of question docs (must include id/_id, section, marks, correctAnswer)
    answers: list of {questionId, answer, marked}
    """

    q_by_id: Dict[str, Dict[str, Any]] = {}
    for q in questions:
        qid = str(q.get("id") or q.get("questionId") or q.get("_id"))
        q_by_id[qid] = q

    total_marks = 0
    scored_marks = 0

    section_totals: Dict[str, int] = {}
    section_scored: Dict[str, int] = {}

    review: List[Dict[str, Any]] = []

    for qid, q in q_by_id.items():
        marks = int(q.get("marks", 0))
        section = q.get("section", "General")
        total_marks += marks
        section_totals[section] = section_totals.get(section, 0) + marks

    for a in answers:
        qid = str(a.get("questionId"))
        q = q_by_id.get(qid)
        if not q:
            # ignore answers that don't map
            continue

        correct = q.get("correctAnswer")
        user_ans = a.get("answer")

        is_correct = False
        if q.get("type") == "multiple":
            is_correct = _normalize_answer(user_ans) == _normalize_answer(correct)
        else:
            is_correct = _normalize_answer(user_ans) == _normalize_answer(correct)

        marks = int(q.get("marks", 0))
        section = q.get("section", "General")

        if is_correct:
            scored_marks += marks
            section_scored[section] = section_scored.get(section, 0) + marks
        else:
            section_scored.setdefault(section, section_scored.get(section, 0))

        review.append(
            {
                "questionId": qid,
                "question": q.get("question"),
                "type": q.get("type"),
                "section": section,
                "marks": marks,
                "options": q.get("options", []),
                "correctAnswer": correct,
                "userAnswer": user_ans,
                "isCorrect": is_correct,
                "marked": bool(a.get("marked", False)),
            }
        )

    percentage = 0.0
    if total_marks > 0:
        percentage = round((scored_marks / total_marks) * 100.0, 2)

    passed = percentage >= float(passing_percent)

    section_breakdown = []
    for section, tmarks in section_totals.items():
        smarks = section_scored.get(section, 0)
        spct = 0.0
        if tmarks > 0:
            spct = round((smarks / tmarks) * 100.0, 2)
        section_breakdown.append(
            {
                "section": section,
                "totalMarks": tmarks,
                "scoredMarks": smarks,
                "percentage": spct,
            }
        )

    # stable ordering
    section_breakdown.sort(key=lambda x: x["section"])

    return {
        "totalMarks": total_marks,
        "scoredMarks": scored_marks,
        "percentage": percentage,
        "passed": passed,
        "passingPercent": float(passing_percent),
        "sectionBreakdown": section_breakdown,
        "review": review,
    }
