import React, { useState } from "react";
import "./TestInstructions.css";

interface TestInstructionsProps {
  testName: string;
  duration: number;
  onStart: () => void;
  onBack: () => void;
}

const TestInstructions: React.FC<TestInstructionsProps> = ({
  testName,
  duration,
  onStart,
  onBack,
}) => {
  const [agreed, setAgreed] = useState(false);

  return (
    // ✅ ROOT FIX (same concept as TestDetails): break out of parent padding/max-width
    <div className="instructions-root">
      {/* ===== TOP HEADER ===== */}
      <header className="test-header">
        <div className="test-header-left">
          <img
            src="/assets/emax-logo.png"
            alt="Emax Technologies"
            className="topbar-logo"
          />
          <h2 className="test-info">Online Exam Portal</h2>
        </div>

        <div className="user-info">
          <span className="user-meta">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })}{" "}
            | Logged in as : Sample
          </span>
        </div>
      </header>

      {/* ===== SUB HEADER ===== */}
      <div className="instructions-subheader">
        <div className="instructions-meta">
          <span>{testName}</span>
        </div>

        <div className="text-controls">
          <button className="control-icon-btn" title="Increase font size" type="button">
            A↑
          </button>
          <button className="control-icon-btn" title="Decrease font size" type="button">
            A↓
          </button>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="instructions-content">
        <div className="instructions-card">
          <h1 className="instructions-main-title">Welcome to {testName}</h1>

          <p className="instructions-intro">
            This is a sample of questions that are representative of the{" "}
            <strong>{testName}</strong> certification exam.
          </p>

          <div className="instructions-disclaimer">
            <strong>Disclaimer:</strong> These sample questions are for
            self-evaluation purposes only and do not appear on the actual
            certification exams. Answering the sample questions correctly is no
            guarantee that you will pass the certification exam. The
            certification exam covers a much broader spectrum of topics, so do
            make sure to familiarize yourself with all topics listed in the exam
            competency areas before taking the certification exam. At the end of
            the sample assessment, you can see the correct answers for any
            questions you got wrong.
          </div>

          <p>
            The time allotted for the sample assessment is{" "}
            {String(Math.floor(duration / 60)).padStart(2, "0")}:
            {String(duration % 60).padStart(2, "0")} minutes. For details of the
            time allotted for actual certification exams, please see the SAP
            Training Shop. Answering a question correctly results in one point.
            Answering a question incorrectly results in zero points. For
            multiple response questions, all of the responses need to be correct
            in order to be awarded one point.
          </p>

          <p>
            Before starting the sample assessment, read the following
            instructions carefully.
          </p>

          <p>
            <strong>Good luck!</strong>
          </p>

          <h3 className="instructions-section-title">Starting the Sample Assessment</h3>
          <ul className="instructions-list">
            <li>
              As soon as you select <strong>Continue</strong> at the bottom of
              the screen, the timer begins.
            </li>
            <li>
              This sample assessment includes multiple choice and multiple
              response questions. For multiple choice questions, select one
              single answer. For multiple response questions, select more than
              one answer (the number of correct answers is stated in the
              question).
            </li>
          </ul>

          <h3 className="instructions-section-title">During the Sample Assessment</h3>
          <ul className="instructions-list">
            <li>
              At the top right of the screen, a timer counts down the remaining
              assessment time.
            </li>
            <li>
              Selecting <strong>Next Question</strong> brings you forward one
              question, <strong>Previous Question</strong> allows you to go
              back.
            </li>
          </ul>

          <h3 className="instructions-section-title">Ending the Sample Assessment</h3>
          <ul className="instructions-list">
            <li>
              Select <strong>Submit</strong> when you have completed the exam.
              IMPORTANT: You cannot continue with the assessment after you have
              confirmed the Submit dialog. Selecting <strong>Submit</strong>{" "}
              will end the sample assessment and save your results.
            </li>
          </ul>

          <div className="agreement-section">
            <label className="agreement-checkbox">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have read and understood the instructions and agree to proceed
                with the assessment
              </span>
            </label>
          </div>
        </div>

        <footer className="instructions-footer">
          <div className="footer-actions">
            <button className="footer-btn secondary" onClick={onBack} type="button">
              Back
            </button>
            <button
              className="footer-btn primary"
              onClick={onStart}
              disabled={!agreed}
              type="button"
            >
              Continue
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TestInstructions;