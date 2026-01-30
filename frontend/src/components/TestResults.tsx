import React, { useState, useEffect } from 'react';
import './TestResults.css';
import { apiGet } from '../services/api';

interface Test {
  id: string;
  name: string;
  duration: number;
  questions: number;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
}

interface UserResult {
  id: string;
  userId: string;
  userName: string;
  percentage: number;
  scoredMarks: number;
  totalMarks: number;
  passed: boolean;
  submittedAt: string;
  timeSpentSec: number;
  percentile: number;
}

interface QuestionReview {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string | string[];
  correctAnswer?: string | string[];
  marks: number;
  section: string;
}

interface DetailedResult {
  attemptId: string;
  userId: string;
  userName: string;
  examName: string;
  totalMarks: number;
  scoredMarks: number;
  percentage: number;
  passed: boolean;
  percentile: number;
  submittedAt: string;
  timeSpentSec: number;
  sectionWise: Record<string, { total: number; scored: number }>;
  questionReview: QuestionReview[];
}

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[];
  section: string;
  marks: number;
}

type View = 'tests' | 'users' | 'details';

const TestResults: React.FC = () => {
  const [view, setView] = useState<View>('tests');
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [detailedResult, setDetailedResult] = useState<DetailedResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'score-high' | 'score-low' | 'name' | 'date'>('score-high');

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [userResults, searchQuery, filterStatus, sortBy]);

  const loadTests = async () => {
    try {
      const res = await apiGet<{ tests: any[] }>('/admin/results/tests');
      const testsData = res.tests.map((t: any) => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        questions: t.questions,
        totalAttempts: t.totalAttempts || 0,
        avgScore: t.avgScore || 0,
        passRate: t.passRate || 0,
      }));
      setTests(testsData);
    } catch (e) {
      console.error('Failed to load tests:', e);
    }
  };

  const loadUserResults = async (testId: string) => {
    try {
      const res = await apiGet<{ results: any[] }>(`/admin/results/tests/${testId}/users`);
      const results = res.results.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName || r.userId,
        percentage: r.percentage,
        scoredMarks: r.scoredMarks,
        totalMarks: r.totalMarks,
        passed: r.passed,
        submittedAt: r.submittedAt,
        timeSpentSec: r.timeSpentSec,
        percentile: r.percentile || 0,
      }));
      setUserResults(results);
    } catch (e) {
      console.error('Failed to load user results:', e);
    }
  };

  const loadDetailedResult = async (resultId: string, testId: string) => {
    try {
      const [resultRes, testRes] = await Promise.all([
        apiGet<{ result: any }>(`/admin/results/${resultId}`),
        apiGet<{ test: any }>(`/admin/exams/${testId}`),
      ]);

      const result = resultRes.result;
      const test = testRes.test;

      setDetailedResult({
        attemptId: result.attemptId,
        userId: result.userId,
        userName: result.userName || result.userId,
        examName: test.testName,
        totalMarks: result.totalMarks,
        scoredMarks: result.scoredMarks,
        percentage: result.percentage,
        passed: result.passed,
        percentile: result.percentile || 0,
        submittedAt: result.submittedAt,
        timeSpentSec: result.timeSpentSec || 0,
        sectionWise: result.sectionWise || {},
        questionReview: result.questionReview || [],
      });

      setQuestions(test.questions || []);
    } catch (e) {
      console.error('Failed to load detailed result:', e);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...userResults];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((r) =>
        r.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.userName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus === 'passed') {
      filtered = filtered.filter((r) => r.passed);
    } else if (filterStatus === 'failed') {
      filtered = filtered.filter((r) => !r.passed);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score-high':
          return b.percentage - a.percentage;
        case 'score-low':
          return a.percentage - b.percentage;
        case 'name':
          return a.userName.localeCompare(b.userName);
        case 'date':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredResults(filtered);
  };

  const handleTestSelect = async (test: Test) => {
    setSelectedTest(test);
    await loadUserResults(test.id);
    setView('users');
  };

  const handleUserSelect = async (user: UserResult) => {
    setSelectedUser(user);
    await loadDetailedResult(user.id, selectedTest!.id);
    setView('details');
  };

  const handleBackToTests = () => {
    setView('tests');
    setSelectedTest(null);
    setUserResults([]);
    setSearchQuery('');
    setFilterStatus('all');
    setSortBy('score-high');
  };

  const handleBackToUsers = () => {
    setView('users');
    setSelectedUser(null);
    setDetailedResult(null);
    setQuestions([]);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // RENDER: Tests View
  if (view === 'tests') {
    return (
      <div className="test-results-container">
        <div className="results-header">
          <h2>Test Results & Analytics</h2> 
          <p className="subtitle">View comprehensive analytics and student performance</p>
        </div>

        <div className="tests-grid">
          {tests.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No test results available yet</p>
            </div>
          )}

          {tests.map((test) => (
            <div key={test.id} className="test-card" onClick={() => handleTestSelect(test)}>
              <div className="test-card-header">
                <h3>{test.name}</h3>
                <span className="test-badge">{test.totalAttempts} attempts</span>
              </div>

              <div className="test-stats">
                <div className="stat-item">
                  <span className="stat-label">Questions</span>
                  <span className="stat-value">{test.questions}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">{test.duration}m</span>
                </div>
              </div>

              <div className="test-metrics">
                <div className="metric">
                  <span className="metric-label">Average Score</span>
                  <span className="metric-value">{test.avgScore.toFixed(1)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Pass Rate</span>
                  <span className="metric-value success">{test.passRate.toFixed(1)}%</span>
                </div>
              </div>

              <div className="test-card-footer">
                <span className="view-link">View Results →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // RENDER: Users View
  if (view === 'users') {
    return (
      <div className="test-results-container">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToTests}>
            ← Back to Tests
          </button>
          <div>
            <h2>{selectedTest?.name}</h2>
            <p className="subtitle">{userResults.length} student attempts</p>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
              <option value="all">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="score-high">Highest Score</option>
              <option value="score-low">Lowest Score</option>
              <option value="name">Name (A-Z)</option>
              <option value="date">Most Recent</option>
            </select>
          </div>
        </div>

        <div className="users-list">
          {filteredResults.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>No results found</p>
            </div>
          )}

          {filteredResults.map((user) => (
            <div key={user.id} className="user-result-card" onClick={() => handleUserSelect(user)}>
              <div className="user-info">
                <div className="user-avatar">
                  {user.userName.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <h4>{user.userName}</h4>
                  <span className="user-id">{user.userId}</span>
                </div>
              </div>

              <div className="user-score">
                <div className={`score-badge ${user.passed ? 'passed' : 'failed'}`}>
                  {user.percentage.toFixed(1)}%
                </div>
                <span className="score-marks">
                  {user.scoredMarks} / {user.totalMarks}
                </span>
              </div>

              <div className="user-status">
                <span className={`status-badge ${user.passed ? 'passed' : 'failed'}`}>
                  {user.passed ? '✓ Passed' : '✗ Failed'}
                </span>
                <span className="percentile">Top {100 - user.percentile}%</span>
              </div>

              <div className="user-meta">
                <span className="meta-item">⏱ {formatTime(user.timeSpentSec)}</span>
                <span className="meta-item">📅 {formatDate(user.submittedAt)}</span>
              </div>

              <div className="view-details">
                View Details →
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // RENDER: Details View
  if (view === 'details' && detailedResult) {
    return (
      <div className="test-results-container">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToUsers}>
            ← Back to Results
          </button>
          <div>
            <h2>{detailedResult.userName}</h2>
            <p className="subtitle">{detailedResult.examName}</p>
          </div>
        </div>

        <div className="detailed-summary">
          <div className="summary-card main-score">
            <div className={`score-circle ${detailedResult.passed ? 'passed' : 'failed'}`}>
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={detailedResult.passed ? '#2e7d32' : '#d32f2f'}
                  strokeWidth="8"
                  strokeDasharray={`${(detailedResult.percentage * 2.827).toFixed(2)} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="score-text">
                <span className="percentage">{detailedResult.percentage.toFixed(1)}%</span>
                <span className={`status ${detailedResult.passed ? 'passed' : 'failed'}`}>
                  {detailedResult.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            </div>
          </div>

          <div className="summary-stats">
            <div className="stat-box">
              <span className="stat-label">Score</span>
              <span className="stat-value">
                {detailedResult.scoredMarks} / {detailedResult.totalMarks}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Percentile</span>
              <span className="stat-value">{detailedResult.percentile}th</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Time Spent</span>
              <span className="stat-value">{formatTime(detailedResult.timeSpentSec)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Submitted</span>
              <span className="stat-value">{formatDate(detailedResult.submittedAt)}</span>
            </div>
          </div>
        </div>

        <div className="section-performance">
          <h3>Section-wise Performance</h3>
          <div className="sections-list">
            {Object.entries(detailedResult.sectionWise || {}).map(([section, data]) => {
              const sectionPercentage = data.total ? ((data.scored / data.total) * 100).toFixed(1) : '0.0';
              return (
                <div key={section} className="section-card">
                  <div className="section-header">
                    <h4>{section}</h4>
                    <span className="section-score">
                      {data.scored} / {data.total}
                    </span>
                  </div>
                  <div className="section-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${sectionPercentage}%` }}
                      />
                    </div>
                    <span className="section-percentage">{sectionPercentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="question-breakdown">
          <h3>Question-by-Question Analysis</h3>
          <div className="questions-list">
            {detailedResult.questionReview.map((review, idx) => {
              const question = questions.find((q) => q.id === review.questionId);
              return (
                <div key={review.questionId} className={`question-card ${review.isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header">
                    <span className="question-number">Q{idx + 1}</span>
                    <span className="question-section">{review.section}</span>
                    <span className={`question-status ${review.isCorrect ? 'correct' : 'incorrect'}`}>
                      {review.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                    <span className="question-marks">{review.marks} marks</span>
                  </div>

                  <p className="question-text">{question?.question || 'Question'}</p>

                  <div className="question-answers">
                    <div className="answer-row">
                      <span className="answer-label">Student's Answer:</span>
                      <span className="answer-value">
                        {Array.isArray(review.userAnswer)
                          ? review.userAnswer.join(', ')
                          : review.userAnswer || 'Not answered'}
                      </span>
                    </div>

                    {!review.isCorrect && (
                      <div className="answer-row">
                        <span className="answer-label">Correct Answer:</span>
                        <span className="answer-value correct">
                          {Array.isArray(review.correctAnswer)
                            ? review.correctAnswer.join(', ')
                            : review.correctAnswer ?? 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TestResults;