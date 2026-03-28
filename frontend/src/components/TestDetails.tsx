import React from "react";
import "./TestDetails.css";

interface TestDetailsProps {
  testName: string;
  questionCount: number;
  duration: number;
  passingPercentage: number;
  onContinue: () => void;
  onBack?: () => void;
}

const TestDetails: React.FC<TestDetailsProps> = ({
  testName,
  questionCount,
  duration,
  passingPercentage,
  onContinue,
  onBack,
}) => {
  return (
    <div className="test-details-root">
      {/* ===== TOP BAR ===== */}
      <header className="test-header">
        <div className="test-header-left">
          <img
            src="/assets/emax-logo.png"
            alt="Emax Technologies"
            className="test-logo"
          />
          <span className="test-portal-title">Online Exam Portal</span>
        </div>
        <div className="test-header-right">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          })}{" "}
          | Logged in as : Sample
        </div>
      </header>

      {/* ===== BACK BAR ===== */}
      {onBack && (
        <div className="test-back-bar">
          <button className="secondary-btn" onClick={onBack}>
            ← Back to Dashboard
          </button>
        </div>
      )}

      {/* ===== CONTENT ===== */}
      <main className="test-details-content">
        <div className="details-card">
          <h1 className="details-title">{testName}</h1>
          <div className="details-grid">
            <div className="detail-box">
              <span className="detail-label">Number of Questions</span>
              <span className="detail-value">{questionCount}</span>
            </div>
            <div className="detail-box">
              <span className="detail-label">Duration</span>
              <span className="detail-value">{duration} minutes</span>
            </div>
            <div className="detail-box">
              <span className="detail-label">Passing Score</span>
              <span className="detail-value">{passingPercentage}%</span>
            </div>
            <div className="detail-box">
              <span className="detail-label">Question Types</span>
              <span className="detail-value">
                Multiple Choice, Multiple Response
              </span>
            </div>
          </div>
          <div className="details-actions">
            <button className="primary-btn large" onClick={onContinue}>
              Continue to Instructions
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TestDetails;