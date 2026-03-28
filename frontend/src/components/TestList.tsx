import React, { useEffect, useState } from "react";
import "./TestList.css";
import { apiDelete, apiGet, apiPost } from "../services/api";

interface Section {
  id: string;
  name: string;
}

interface Test {
  id: string;
  name: string;
  duration: number;
  questions: number;
  sections: Section[];
  createdAt: string;
  status: "active" | "draft" | "completed";
}

interface User {
  id: string;
  name: string;
  userId: string;
}

interface TestListProps {
  onCreateNew: () => void;
  onEditTest?: (testId: string) => void;
}

const TestList: React.FC<TestListProps> = ({ onCreateNew, onEditTest }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assigningTest, setAssigningTest] = useState<Test | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const loadTests = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>("/admin/exams");

      if (Array.isArray(res.tests)) {
        setTests(res.tests);
      } else {
        console.error("Unexpected /admin/exams response:", res);
        setTests([]);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load tests from backend");
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await apiGet<any>("/admin/users");
      if (Array.isArray(res.users)) {
        setAllUsers(res.users);
      }
    } catch (e) {
      console.error("Failed to load users", e);
    }
  };

  useEffect(() => {
    loadTests();
    loadUsers();
  }, []);

  const handleSelectAll = () => {
    if (selectedUserIds.length === allUsers.length) {
      // If all are selected, deselect all
      setSelectedUserIds([]);
    } else {
      // Select all users
      setSelectedUserIds(allUsers.map(user => user.userId));
    }
  };

  const deleteTest = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this test?");
    if (!ok) return;

    try {
      await apiDelete(`/admin/exams/${id}`);
      setTests((prev) => prev.filter((t) => t.id !== id));
      if (selectedTest?.id === id) setSelectedTest(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete test");
    }
  };

  const handleEdit = (testId: string) => {
    if (onEditTest) {
      onEditTest(testId);
    } else {
      alert("Edit functionality will be implemented soon");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "status-active";
      case "draft":
        return "status-draft";
      case "completed":
        return "status-completed";
      default:
        return "";
    }
  };

  const allSelected = allUsers.length > 0 && selectedUserIds.length === allUsers.length;
  const someSelected = selectedUserIds.length > 0 && selectedUserIds.length < allUsers.length;

  return (
    <div className="test-list" style={{ paddingTop: '2rem' }}>
      <div className="page-header">
        <h2>All Tests</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="primary-btn" onClick={loadTests}>
            Refresh
          </button>
          <button className="primary-btn" onClick={onCreateNew}>
            + Create New Test
          </button>
        </div>
      </div>

      {loading && <p style={{ color: "#6a6d70" }}>Loading tests...</p>}

      <div className="tests-grid">
        {Array.isArray(tests) && tests.map((test) => (
          <div key={test.id} className="test-card">
            <div className="test-card-header">
              <h3>{test.name}</h3>
              <span className={`status-badge ${getStatusColor(test.status)}`}>
                {test.status}
              </span>
            </div>
            <div className="test-card-body">
              <div className="test-info">
                <span className="info-label">Duration:</span>
                <span className="info-value">{test.duration} min</span>
              </div>
              <div className="test-info">
                <span className="info-label">Questions:</span>
                <span className="info-value">{test.questions}</span>
              </div>
              <div className="test-info">
                <span className="info-label">Sections:</span>
                <span className="info-value">
                    {Array.isArray(test.sections) 
                      ? test.sections.map(s => typeof s === 'string' ? s : s.name).join(", ")
                      : "N/A"}
                  </span>
              </div>
              <div className="test-info">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  {new Date(test.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="test-card-actions">
              <button
                className="action-btn view-btn"
                onClick={() => setSelectedTest(test)}
              >
                View Details
              </button>

              <button 
                className="action-btn edit-btn"
                onClick={() => handleEdit(test.id)}
              >
                Edit
              </button>

              <button
                className="action-btn edit-btn"
                onClick={() => {
                  setAssigningTest(test);
                  setSelectedUserIds([]);
                }}
              >
                Assign
              </button>

              <button
                className="action-btn delete-btn"
                onClick={() => deleteTest(test.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && tests.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No tests created yet</h3>
          <p>Create your first test to get started</p>
          <button className="primary-btn" onClick={onCreateNew}>
            Create Test
          </button>
        </div>
      )}

      {selectedTest && (
        <div className="modal-overlay" onClick={() => setSelectedTest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTest.name}</h2>
              <button className="close-btn" onClick={() => setSelectedTest(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Duration:</span>
                <span>{selectedTest.duration} minutes</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Total Questions:</span>
                <span>{selectedTest.questions}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Sections:</span>
                <div className="section-tags">
                  {selectedTest.sections.map((section, index) => (
                    <span key={typeof section === 'string' ? section : section.id} className="section-tag">
                      {typeof section === 'string' ? section : section.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`status-badge ${getStatusColor(selectedTest.status)}`}>
                  {selectedTest.status}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created:</span>
                <span>{new Date(selectedTest.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setSelectedTest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {assigningTest && (
        <div className="modal-overlay" onClick={() => setAssigningTest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Test: {assigningTest.name}</h2>
              <button
                className="close-btn"
                onClick={() => setAssigningTest(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {allUsers.length === 0 && (
                <p style={{ color: "#6a6d70" }}>No users available</p>
              )}

              {/* Select All Section */}
              {allUsers.length > 0 && (
                <div style={{
                  marginBottom: "1rem",
                  paddingBottom: "1rem",
                  borderBottom: "2px solid #e9ecef"
                }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={input => {
                        if (input) {
                          input.indeterminate = someSelected;
                        }
                      }}
                      onChange={handleSelectAll}
                      style={{
                        width: "1.125rem",
                        height: "1.125rem",
                        marginRight: "0.75rem",
                        cursor: "pointer",
                        accentColor: "#0070f2"
                      }}
                    />
                    <span style={{
                      fontWeight: 500,
                      color: "#0070f2"
                    }}>
                      {allSelected ? 'Deselect All' : 'Select All'}
                      {selectedUserIds.length > 0 && ` (${selectedUserIds.length} selected)`}
                    </span>
                  </label>
                </div>
              )}

              {/* User List */}
              <div className="assign-user-list">
                {allUsers.map((user) => (
                  <label
                    key={user.userId}
                    className="assign-user-row"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.userId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds((prev) => [...prev, user.userId]);
                        } else {
                          setSelectedUserIds((prev) =>
                            prev.filter((id) => id !== user.userId)
                          );
                        }
                      }}
                    />
                    <span style={{ marginLeft: "0.5rem" }}>
                      {user.name} ({user.userId})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="primary-btn"
                disabled={selectedUserIds.length === 0}
                onClick={async () => {
                  try {
                    await apiPost(
                      `/admin/exams/${assigningTest.id}/assign`,
                      { userIds: selectedUserIds }
                    );
                    alert("Test assigned successfully");
                    setAssigningTest(null);
                  } catch (err) {
                    console.error(err);
                    alert("Failed to assign test");
                  }
                }}
              >
                Assign Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestList;