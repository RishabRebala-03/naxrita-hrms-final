// TestBuilder.tsx
import React, { useState } from 'react';
import './TestBuilder.css';
import { apiPost } from "../services/api";

interface Question {
  id: string;
  type: 'mcq' | 'multiple' | 'text';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  section: string;
  marks: number;
}

interface Section {
  id: string;
  name: string;
}

interface TestBuilderProps {
  onBack: () => void;
}

const TestBuilder: React.FC<TestBuilderProps> = ({ onBack }) => {
  const [testName, setTestName] = useState('');
  const [duration, setDuration] = useState(60);
  const [passingPercentage, setPassingPercentage] = useState(40);
  const [sections, setSections] = useState<Section[]>([
    { id: 'general', name: 'General' }
  ]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newSection, setNewSection] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({
    type: 'mcq' as 'mcq' | 'multiple' | 'text',
    question: '',
    options: ['', ''],
    correctAnswer: '',
    correctAnswers: [] as string[],
    section: sections[0]?.id || '',
    marks: 1,
  });

  const addSection = () => {
    const name = newSection.trim();
    if (!name) return;
    const exists = sections.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    setSections([...sections, { id: Date.now().toString(), name }]);
    setNewSection('');
  };

  const addOption = () => {
    setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] });
  };

  const removeOption = (index: number) => {
    const removedOption = questionForm.options[index];
    const newOptions = questionForm.options.filter((_, i) => i !== index);
    setQuestionForm({
      ...questionForm,
      options: newOptions,
      correctAnswers: questionForm.correctAnswers.filter(a => a !== removedOption),
      correctAnswer: questionForm.correctAnswer === removedOption ? '' : questionForm.correctAnswer,
    });
  };

  const addQuestion = () => {
    if (questionForm.type === 'mcq' || questionForm.type === 'multiple') {
      const validOptions = questionForm.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        alert('Please add at least 2 options');
        return;
      }
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      type: questionForm.type,
      question: questionForm.question,
      section: questionForm.section,
      marks: questionForm.marks,
    };

    if (questionForm.type === 'mcq' || questionForm.type === 'multiple') {
      newQuestion.options = questionForm.options.filter(opt => opt.trim());
    }

    if (questionForm.type === 'mcq') {
      newQuestion.correctAnswer = questionForm.correctAnswer;
    } else if (questionForm.type === 'multiple') {
      newQuestion.correctAnswer = questionForm.correctAnswers;
    } else {
      newQuestion.correctAnswer = questionForm.correctAnswer;
    }

    setQuestions([...questions, newQuestion]);
    setQuestionForm({
      type: 'mcq',
      question: '',
      options: ['', ''],
      correctAnswer: '',
      correctAnswers: [],
      section: sections[0]?.id || '',
      marks: 1,
    });
    setShowQuestionForm(false);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const toggleCorrectAnswer = (option: string) => {
    const current = questionForm.correctAnswers;
    if (current.includes(option)) {
      setQuestionForm({ ...questionForm, correctAnswers: current.filter(a => a !== option) });
    } else {
      setQuestionForm({ ...questionForm, correctAnswers: [...current, option] });
    }
  };

  const getQuestionsBySection = (sectionId: string) => {
    return questions.filter(q => q.section === sectionId);
  };

  const handleSaveTest = async () => {
    if (!testName.trim()) { alert("Test name is required"); return; }
    if (questions.length === 0) { alert("Add at least one question before saving the test"); return; }
    if (passingPercentage < 1 || passingPercentage > 100) {
      alert("Passing score must be between 1 and 100");
      return;
    }

    try {
      const sectionNames = sections.map(s => s.name);
      const questionsWithSectionNames = questions.map(q => {
        const sectionObj = sections.find(s => s.id === q.section);
        return { ...q, section: sectionObj ? sectionObj.name : q.section };
      });

      await apiPost("/admin/exams", {
        testName,
        duration,
        passingPercentage,
        sections: sectionNames,
        questions: questionsWithSectionNames,
      });

      alert("Test saved successfully");
      onBack();
    } catch (err) {
      console.error(err);
      alert("Failed to save test");
    }
  };

  return (
    <div className="test-builder page-with-topbar">
      <div className="page-header">
        <h2>Create New Test</h2>
        <button className="secondary-btn" onClick={onBack}>
          ← Back to Tests
        </button>
      </div>

      {/* ── Test Details ── */}
      <div className="form-card">
        <h3>Test Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Test Name *</label>
            <input
              type="text"
              value={testName}
              onChange={e => setTestName(e.target.value)}
              placeholder="Enter test name"
            />
          </div>
          <div className="form-group">
            <label>Duration (minutes) *</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              placeholder="60"
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Passing Score (%) *</label>
            <input
              type="number"
              value={passingPercentage}
              onChange={e => setPassingPercentage(Number(e.target.value))}
              placeholder="40"
              min="1"
              max="100"
            />
          </div>
        </div>

        {/* ── Sections ── */}
        <div className="section-management">
          <h4>Sections</h4>
          <div className="section-tags">
            {sections.map(section => (
              <div key={section.id} className="section-chip">
                {editingSectionId === section.id ? (
                  <input
                    className="section-edit-input"
                    value={section.name}
                    autoFocus
                    onChange={e => setSections(sections.map(s =>
                      s.id === section.id ? { ...s, name: e.target.value } : s
                    ))}
                    onBlur={() => setEditingSectionId(null)}
                    onKeyDown={e => { if (e.key === 'Enter') setEditingSectionId(null); }}
                  />
                ) : (
                  <span className="section-name">{section.name}</span>
                )}
                <div className="section-actions">
                  <button type="button" className="icon-btn" title="Edit section"
                    onClick={() => setEditingSectionId(section.id)}>
                    ✏️
                  </button>
                  <button type="button" className="icon-btn danger" title="Delete section"
                    onClick={() => {
                      const remaining = sections.filter(s => s.id !== section.id);
                      setSections(remaining);
                      setQuestions(questions.filter(q => q.section !== section.id));
                      setQuestionForm(prev => ({
                        ...prev,
                        section: prev.section === section.id ? (remaining[0]?.id || '') : prev.section,
                      }));
                    }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="add-section">
            <input
              type="text"
              value={newSection}
              onChange={e => setNewSection(e.target.value)}
              placeholder="New section name"
              onKeyDown={e => { if (e.key === 'Enter') addSection(); }}
            />
            <button className="primary-btn" onClick={addSection}>Add Section</button>
          </div>
        </div>
      </div>

      {/* ── Questions ── */}
      <div className="questions-section">
        <div className="section-header">
          <h3>Questions ({questions.length})</h3>
          <button className="primary-btn" onClick={() => setShowQuestionForm(!showQuestionForm)}>
            {showQuestionForm ? 'Cancel' : '+ Add Question'}
          </button>
        </div>

        {showQuestionForm && (
          <div className="question-form">
            <div className="form-row">
              <div className="form-group">
                <label>Question Type *</label>
                <select value={questionForm.type}
                  onChange={e => setQuestionForm({ ...questionForm, type: e.target.value as any })}>
                  <option value="mcq">Single Choice (MCQ)</option>
                  <option value="multiple">Multiple Correct Answers</option>
                  <option value="text">Text Answer</option>
                </select>
              </div>
              <div className="form-group">
                <label>Section *</label>
                <select value={questionForm.section}
                  onChange={e => setQuestionForm({ ...questionForm, section: e.target.value })}>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Marks *</label>
                <input type="number" value={questionForm.marks} min="1"
                  onChange={e => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-group">
              <label>Question *</label>
              <textarea value={questionForm.question} rows={3}
                onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })}
                placeholder="Enter your question" />
            </div>

            {(questionForm.type === 'mcq' || questionForm.type === 'multiple') && (
              <div className="options-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label>Options * (minimum 2)</label>
                  <button type="button" className="primary-btn"
                    onClick={addOption} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                    + Add Option
                  </button>
                </div>
                {questionForm.options.map((option, index) => (
                  <div key={index} className="option-input">
                    <input type="text" value={option} placeholder={`Option ${index + 1}`}
                      onChange={e => handleOptionChange(index, e.target.value)} />
                    {questionForm.type === 'mcq' ? (
                      <input type="radio" name="correct"
                        checked={questionForm.correctAnswer === option}
                        onChange={() => setQuestionForm({ ...questionForm, correctAnswer: option })} />
                    ) : (
                      <input type="checkbox"
                        checked={questionForm.correctAnswers.includes(option)}
                        onChange={() => toggleCorrectAnswer(option)} />
                    )}
                    <span className="option-label">Correct</span>
                    {questionForm.options.length > 2 && (
                      <button type="button" className="icon-btn danger"
                        onClick={() => removeOption(index)} title="Remove option"
                        style={{ marginLeft: '0.5rem' }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {questionForm.type === 'text' && (
              <div className="form-group">
                <label>Model Answer (for reference)</label>
                <textarea value={questionForm.correctAnswer} rows={3}
                  onChange={e => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                  placeholder="Enter model answer" />
              </div>
            )}

            <div className="form-actions">
              <button className="primary-btn" onClick={addQuestion}>Add Question</button>
            </div>
          </div>
        )}

        {sections.map(section => {
          const sectionQuestions = getQuestionsBySection(section.id);
          if (sectionQuestions.length === 0) return null;
          return (
            <div key={section.id} className="section-block">
              <h4>{section.name} ({sectionQuestions.length} questions)</h4>
              <div className="questions-list">
                {sectionQuestions.map((q, index) => (
                  <div key={q.id} className="question-card">
                    <div className="question-header">
                      <span className="question-number">Q{index + 1}</span>
                      <span className="question-type">{q.type.toUpperCase()}</span>
                      <span className="question-marks">{q.marks} marks</span>
                      <button className="delete-icon" onClick={() => deleteQuestion(q.id)}>✕</button>
                    </div>
                    <p className="question-text prewrap">{q.question}</p>
                    {q.options && (
                      <ul className="options-list">
                        {q.options.map((opt, i) => (
                          <li key={i} className={
                            (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt)) ||
                            q.correctAnswer === opt ? 'correct-option' : ''
                          }>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {questions.length === 0 && !showQuestionForm && (
          <div className="empty-state">
            No questions added yet. Click "Add Question" to start building your test.
          </div>
        )}
      </div>

      {questions.length > 0 && (
        <div className="form-actions">
          <button className="primary-btn large" onClick={handleSaveTest}>Save Test</button>
        </div>
      )}
    </div>
  );
};

export default TestBuilder;