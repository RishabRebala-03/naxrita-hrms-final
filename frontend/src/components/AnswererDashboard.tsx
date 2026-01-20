import React, { useEffect, useMemo, useState } from "react";
import TestInterface from "./TestInterface";
import "./AnswererDashboard.css";
import { apiGet } from "../services/api";

type AnswererView = "dashboard" | "tests";

interface Props {
  userName: string; // NOTE: you are passing userId into this currently
  onLogout: () => void;
}

interface Insights {
  testsTaken: number;
  testsPassed: number;
  avgScore: number;
  bestScore: number;
  streak: number;
}

interface AssignedTest {
  id: string;           // examId
  name: string;
  duration: number;
  questions: number;
  status: "active" | "draft" | "completed";

  totalMarks?: number;
  passingPercentage?: number;
}

interface ExamForTaking {
  id: string;
  testName: string;
  duration: number;
  questions: any[];
}

const AnswererDashboard: React.FC<Props> = ({ userName, onLogout }) => {
  const [activeView, setActiveView] = useState<AnswererView>("dashboard");

  const [insights, setInsights] = useState<Insights>({
    testsTaken: 0,
    testsPassed: 0,
    avgScore: 0,
    bestScore: 0,
    streak: 0,
  });

  const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);

  // when user chooses a test, we load it and render TestInterface
  const [activeExam, setActiveExam] = useState<ExamForTaking | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    []
  );

  const loadInsights = async () => {
    try {
      const res = await apiGet<{ insights: Insights }>(
        `/answerer/dashboard?userId=${encodeURIComponent(userName)}`
      );
      setInsights(res.insights);
    } catch (e) {
      console.error(e);
      // keep defaults
    }
  };

  const loadAssignedTests = async () => {
    setLoadingTests(true);
    try {
      const res = await apiGet<{ tests: AssignedTest[] }>(
        `/answerer/tests?userId=${encodeURIComponent(userName)}`
      );
      setAssignedTests(res.tests || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load your tests from backend");
      setAssignedTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    loadInsights();
    loadAssignedTests();
  }, [userName]);

  const startExam = async (examId: string) => {
    setLoadingExam(true);
    try {
      const res = await apiGet<{ test: ExamForTaking }>(
        `/answerer/tests/${examId}?userId=${encodeURIComponent(userName)}`
      );
      setActiveExam(res.test);
      setActiveView("tests");
    } catch (e) {
      console.error(e);
      alert("Failed to start test");
    } finally {
      setLoadingExam(false);
    }
  };

  const exitExam = () => {
    setActiveExam(null);
    setActiveView("dashboard");
    // refresh insights after a submission
    loadInsights();
    loadAssignedTests();
  };

  return (
    <div className="answerer-container">
      {/* Sidebar hidden during exam view */}
      {activeView !== "tests" && (
        <aside className="answerer-sidebar">
          <div className="sidebar-header">
            <img
              src="/assets/emax-logo.png"
              alt="Emax Technologies"
              className="sidebar-logo"
            />
            <span className="role-badge">Test Taker</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveView("dashboard")}
            >
              <span className="nav-icon">📊</span>
              Dashboard
            </button>

            <button className="nav-item" onClick={() => setActiveView("tests")}>
              <span className="nav-icon">📝</span>
              Tests
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                {userName?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="user-name">{userName}</div>
            </div>

            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </aside>
      )}

      <main className={`answerer-main ${activeView === "tests" ? "no-sidebar" : ""}`}>
        {activeView === "dashboard" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">Online Exam Portal</span>
              </div>
              <div className="dashboard-topbar-right">{today}</div>
            </div>

            <div className="dashboard-home">
              <h2>Welcome back, {userName} 👋</h2>
              <p className="subtitle">Your learning progress and test insights</p>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🧾</div>
                  <div className="stat-info">
                    <h3>Tests Taken</h3>
                    <div className="stat-number">{insights.testsTaken}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <h3>Tests Passed</h3>
                    <div className="stat-number">{insights.testsPassed}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📈</div>
                  <div className="stat-info">
                    <h3>Average Score</h3>
                    <div className="stat-number">{insights.avgScore}%</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-info">
                    <h3>Best Score</h3>
                    <div className="stat-number">{insights.bestScore}%</div>
                  </div>
                </div>
              </div>

              <div className="quick-actions">
                <div className="qa-card enhanced">
                  <div className="qa-left">
                    <span className="qa-badge">Next Step</span>
                    <h3>Ready for your next attempt?</h3>
                    <p>Your assigned assessments will appear below.</p>
                    <p>Start when ready – progress is tracked automatically.</p>
                  </div>

                  <div className="qa-right">
                    <button
                      className="primary-btn large"
                      onClick={() => {
                        const testsPanel = document.querySelector('.lower-grid');
                        testsPanel?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      View Tests
                    </button>
                  </div>
                </div>
              </div>

              <div className="lower-grid">
                <div className="panel">
                  <h3 className="panel-title">Assigned Tests</h3>

                  {loadingTests && (
                    <div style={{ color: "#6a6d70" }}>Loading...</div>
                  )}

                  {!loadingTests && assignedTests.length === 0 && (
                    <div style={{ color: "#6a6d70" }}>
                      No tests assigned yet.
                    </div>
                  )}

                  {!loadingTests &&
                    assignedTests.map((t) => (
                      <div key={t.id} className="test-row">
                        <div>
                          <div className="test-name">{t.name}</div>
                          <div className="test-meta">
                            {t.questions} Questions • {t.duration} minutes
                          </div>
                        </div>

                        <button
                          className="primary-btn"
                          style={{ padding: "0.5rem 0.9rem" }}
                          disabled={loadingExam}
                          onClick={() => startExam(t.id)}
                        >
                          {loadingExam ? "Starting..." : "Start"}
                        </button>
                      </div>
                    ))}
                </div>

                <div className="panel">
                  <h3 className="panel-title">Recent Activity</h3>
                  <div style={{ color: "#6a6d70", padding: "0.75rem 0" }}>
                    Your recent test results will appear here
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === "tests" && (
          <div className="tests-wrapper">
            {!activeExam ? (
              <>
                <div className="tests-page-header">
                  <h2>Your Tests</h2>
                  <button className="secondary-btn" onClick={exitExam}>
                    ← Back to Dashboard
                  </button>
                </div>

                <div className="tests-grid">
                  {assignedTests.map((t) => (
                    <div key={t.id} className="test-card detailed">
                      <div className="test-card-header">
                        <h3 className="test-title">{t.name}</h3>
                      </div>

                      <div className="test-card-body">
                        <div className="test-card-left">
                          <div className="test-meta-grid">
                            <div className="meta-item">
                              <div className="meta-label">Questions</div>
                              <div className="meta-value">{t.questions}</div>
                            </div>

                            <div className="meta-item">
                              <div className="meta-label">Duration</div>
                              <div className="meta-value">{t.duration}</div>
                            </div>

                            <div className="meta-item">
                              <div className="meta-label">Total Marks</div>
                              <div className="meta-value">{t.totalMarks ?? t.questions}</div>
                            </div>

                            <div className="meta-item">
                              <div className="meta-label">Pass Score</div>
                              <div className="meta-value">{t.passingPercentage ?? 40}%</div>
                            </div>
                          </div>
                        </div>

                        <div className="test-card-right">
                          <button
                            className="primary-btn large"
                            disabled={loadingExam}
                            onClick={() => startExam(t.id)}
                          >
                            {loadingExam ? "Starting..." : "Start Test"}
                          </button>
                        </div>
                      </div>

                      <div className="test-card-footer">
                        <span className={`test-status ${t.status}`}>
                          {t.status}
                        </span>
                        {t.status !== "active" && (
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {t.status === "draft" ? "Test is in draft mode" : "Test completed"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <TestInterface
                userId={userName}
                examId={activeExam.id}
                testName={activeExam.testName}
                duration={activeExam.duration}
                questions={activeExam.questions}
                onExit={exitExam}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AnswererDashboard;