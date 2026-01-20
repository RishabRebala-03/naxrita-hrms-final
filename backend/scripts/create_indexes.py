from config.db import get_db


def main():
    db = get_db()

    # Users
    db.users.create_index("userId", unique=True)
    db.users.create_index("role")

    # Exams / questions
    db.exams.create_index("status")
    db.questions.create_index("examId")

    # Assignments
    db.exam_assignments.create_index([("examId", 1), ("userId", 1)], unique=True)
    db.exam_assignments.create_index("userId")

    # Attempts / Results
    db.attempts.create_index([("examId", 1), ("userId", 1), ("status", 1)])
    db.results.create_index("attemptId", unique=True)
    db.results.create_index("userId")

    print("Indexes created/ensured.")


if __name__ == "__main__":
    main()
