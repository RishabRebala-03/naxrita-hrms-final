import React from 'react';
import './QuestionPanel.css';

interface Question {
  id: string;
  type: 'mcq' | 'multiple' | 'text';
  question: string;
  options?: string[];
  section: string;
  marks: number;
}

interface QuestionPanelProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  answer: string | string[];
  isMarked: boolean;
  onAnswer: (answer: string | string[]) => void;
  onMarkForReview: () => void;
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  questionNumber,
  answer,
  onAnswer,
}) => {
  const handleOptionClick = (option: string) => {
    if (question.type === 'mcq') {
      onAnswer(option);
    } else if (question.type === 'multiple') {
      const currentAnswers = Array.isArray(answer) ? answer : [];
      if (currentAnswers.includes(option)) {
        onAnswer(currentAnswers.filter(a => a !== option));
      } else {
        onAnswer([...currentAnswers, option]);
      }
    }
  };

  return (
    <div className="question-panel">
      <div className="question-header">
  <span className="question-number">
    {questionNumber}.
  </span>
  <p className="question-text">
    {question.question}
  </p>
</div>


      {question.type === 'multiple' && (
        <p className="note-text">Note: There are {question.options?.length || 0} correct answers to this question.</p>
      )}

      {question.type === 'mcq' && question.options && (
        <div className="options-list">
          {question.options.map((option, index) => {
            const isSelected = answer === option;
            return (
              <label key={index} className="option-item-label">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={isSelected}
                  onChange={() => handleOptionClick(option)}
                  className="option-radio"
                />
                <span className="option-text">{option}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'multiple' && question.options && (
        <div className="options-list">
          {question.options.map((option, index) => {
            const isSelected = Array.isArray(answer) && answer.includes(option);
            return (
              <label key={index} className="option-item-label">
                <input
                  type="checkbox"
                  name={`question-${question.id}`}
                  value={option}
                  checked={isSelected}
                  onChange={() => handleOptionClick(option)}
                  className="option-checkbox"
                />
                <span className="option-text">{option}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'text' && (
        <textarea
          className="text-answer"
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          rows={6}
        />
      )}
    </div>
  );
};

export default QuestionPanel;