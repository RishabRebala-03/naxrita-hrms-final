import React from 'react';
import './QuestionNavigator.css';

interface Answer {
  questionId: string;
  answer: string | string[];
  marked: boolean;
}

interface Question {
  id: string;
  section: string;
}

interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  answers: Answer[];
  sections: string[];
  currentSection: string;
  onQuestionSelect: (index: number) => void;
  onSectionChange: (section: string) => void;
  getQuestionStatus: (index: number) => string;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  onQuestionSelect,
  getQuestionStatus,
}) => {
  return (
    <div className="question-navigator">
      <div className="navigator-header">
        <h3>Assessment Navigator</h3>
        <button className="close-navigator">✕</button>
      </div>

      <div className="questions-grid">
        {questions.map((_, index) => {
          const status = getQuestionStatus(index);
          return (
            <button
              key={index}
              className={`question-btn ${status} ${currentIndex === index ? 'current' : ''}`}
              onClick={() => onQuestionSelect(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionNavigator;