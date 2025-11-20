// src/components/EmployeeLeaves.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const EmployeeLeaves = ({ user }) => {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [leave, setLeave] = useState({
    leave_type: "Sick",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch balance
      const balanceRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/balance/${user.id}`
      );
      setBalance(balanceRes.data);

      // Fetch history
      const historyRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/history/${user.id}`
      );
      setHistory(historyRes.data);
    } catch (err) {
      console.error("Error fetching leave data:", err);
      setMessage("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  // ADD THIS NEW FUNCTION to check if selected date is birthday
  const isBirthdayDate = (dateStr) => {
    if (!dateStr || !user?.dateOfBirth) return false;
    
    try {
      let dob = user.dateOfBirth;
      if (typeof dob === "object" && dob.$date) {
        dob = new Date(dob.$date);
      } else {
        dob = new Date(dob);
      }
      
      const selectedDate = new Date(dateStr);
      
      return (
        dob.getMonth() === selectedDate.getMonth() &&
        dob.getDate() === selectedDate.getDate()
      );
    } catch (err) {
      return false;
    }
  };

  const showBirthdayIndicator = leave.leave_type === "Optional" && 
                                 leave.start_date && 
                                 leave.end_date &&
                                 leave.start_date === leave.end_date &&
                                 isBirthdayDate(leave.start_date);


  const applyLeave = async () => {
    if (!leave.start_date || !leave.end_date) {
      setMessage("Please select start and end dates");
      return;
    }

    if (leave.leave_type === "Planned") {
      const today = new Date();
      const startDate = new Date(leave.start_date);
      const daysDifference = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < 7) {
        setMessage("⚠️ Planned leave must be applied at least 7 days in advance");
        setTimeout(() => setMessage(""), 5000);
        return;
      }
    }

    try {
      setLoading(true);
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/leaves/apply`, {
        employee_id: user.id,
        leave_type: leave.leave_type,
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason,
      });

      if (res.status === 201) {
        setMessage("Leave applied successfully ✓");
        setLeave({ leave_type: "Sick", start_date: "", end_date: "", reason: "" });
        fetchData();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error: " + (err.response?.data?.error || "Failed to apply leave"));
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Add this function after applyLeave():
  const updateLeave = async () => {
    if (!editingLeave.start_date || !editingLeave.end_date) {
      setMessage("Please select start and end dates");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/update/${editingLeave._id}`,
        {
          leave_type: editingLeave.leave_type,
          start_date: editingLeave.start_date,
          end_date: editingLeave.end_date,
          reason: editingLeave.reason,
        }
      );

      if (res.status === 200) {
        setMessage("Leave updated successfully ✓");
        setEditingLeave(null);
        fetchData();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error: " + (err.response?.data?.error || "Failed to update leave"));
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      let dateValue = dateStr;
      if (typeof dateStr === "object" && dateStr.$date) {
        dateValue = dateStr.$date;
      }
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const cancelLeave = async (leaveId) => {
  if (!window.confirm("Are you sure you want to cancel this leave?")) return;

  try {
    setLoading(true);

    const res = await axios.put(
      `${process.env.REACT_APP_BACKEND_URL}/api/leaves/cancel/${leaveId}`
    );

    if (res.status === 200) {
      setMessage("Leave cancelled successfully ✓");
      fetchData();
      setTimeout(() => setMessage(""), 3000);
    }
  } catch (err) {
    console.error(err);
    setMessage(
      "Error: " + (err.response?.data?.error || "Failed to cancel leave")
    );
    setTimeout(() => setMessage(""), 3000);
  } finally {
    setLoading(false);
  }
};


  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return { bg: "#d1f4dd", text: "#0a5d2c", border: "#7de3a6" };
      case "Rejected":
        return { bg: "#ffe0e0", text: "#c41e3a", border: "#ffb3b3" };
      case "Cancelled":
        return { bg: "#ffe0e0", text: "#c41e3a", border: "#ffb3b3" };
      default:
        return { bg: "#fff4e6", text: "#d97706", border: "#fbbf24" };
    }
  };

  const totalBalance = balance
    ? (balance.sick || 0) + (balance.planned || 0) + (balance.optional || 0)
    : 0;

  return (
    <div className="panel">
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>My Leaves</h3>
        <p className="muted">Apply for leave and track your leave balance</p>
      </div>

      {/* Leave Balance Section */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>
          Total Leave Balance
        </div>
        <div style={{ fontSize: 42, fontWeight: 700, marginBottom: 16 }}>
          {totalBalance} days
        </div>
        
        {balance && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {/* Sick */}
            <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.3)" }}>
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>🤒 Sick</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.sick} days</div>
              <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>Total:</span>
                  <strong>{balance.sickTotal || 6} days</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Used:</span>
                  <strong>{(balance.sickTotal || 6) - balance.sick} days</strong>
                </div>
              </div>
            </div>

            {/* Planned */}
            <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.3)" }}>
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>📅 Planned</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.planned} days</div>
              <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>Total:</span>
                  <strong>{balance.plannedTotal || 12} days</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Used:</span>
                  <strong>{(balance.plannedTotal || 12) - balance.planned} days</strong>
                </div>
              </div>
            </div>

            {/* Optional Holiday */}
            <div style={{ background: "rgba(255,255,255,0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>Optional</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.optional || 0} days</div>
              <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>Total:</span>
                  <strong>{balance.optionalTotal || 2} days</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Used:</span>
                  <strong>{(balance.optionalTotal || 2) - (balance.optional || 0)} days</strong>
                </div>
              </div>
            </div>

            {/* LWP */}
            <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: 14, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.3)" }}>
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>📋 LOP</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{balance.lwp} days</div>
              <div style={{ fontSize: 10, opacity: 0.8, borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>Total:</span>
                  <strong>∞</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Used:</span>
                  <strong>{balance.lwp} days</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 👇👇👇 ADD THIS NEW SECTION BELOW 👇👇👇 */}
      <div style={{
        background: "#eff6ff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        border: "1px solid #bfdbfe"
      }}>
        <div style={{ fontSize: 13, color: "#1e40af", marginBottom: 8, fontWeight: 600 }}>
          📊 Leave Accrual Information
        </div>
        <div style={{ fontSize: 12, color: "#3b82f6", lineHeight: 1.6 }}>
          • <strong>Planned Leave:</strong> 1 day credited every month<br/>
          • <strong>Sick Leave:</strong> 0.5 days credited every month<br/>
          • Accrual starts from your joining date ({balance?.monthsEmployed || 0} months employed)
        </div>
      </div>
      {/* 👆👆👆 NEW SECTION ENDS HERE 👆👆👆 */}

      {/* Apply Leave Section */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: 16 }}>Apply for Leave</h4>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Leave Type *
            </label>
            <select
              className="input"
              value={leave.leave_type}
              onChange={(e) => setLeave({ ...leave, leave_type: e.target.value })}
            >
              <option>Sick</option>
              <option>Planned</option>
              <option>Optional</option>
              <option>LWP</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Start Date *
            </label>
            <input
              className="input"
              type="date"
              value={leave.start_date}
              onChange={(e) => setLeave({ ...leave, start_date: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              End Date *
            </label>
            <input
              className="input"
              type="date"
              value={leave.end_date}
              onChange={(e) => setLeave({ ...leave, end_date: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Reason
            </label>
            <input
              className="input"
              placeholder="Reason for leave"
              value={leave.reason}
              onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
            />
          </div>
        </div>

        <button
          className="btn"
          onClick={applyLeave}
          disabled={loading || !leave.start_date || !leave.end_date}
          style={{ width: "100%" }}
        >
          {loading ? "Submitting..." : "📝 Apply Leave"}
        </button>
      </div>

      {/* Leave History */}
      <div className="card" style={{ padding: 24, border: "1px solid #e5e7eb" }}>
        <h4 style={{ marginTop: 0, marginBottom: 16 }}>
          My Leave History ({history.length})
        </h4>

        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14 }}>No leave applications yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {history.map((h) => {
              const statusColors = getStatusColor(h.status);
              const isPending = h.status === "Pending";
              const isEditing = editingLeave?._id === h._id;

              return (
                <div
                  key={h._id}
                  className="card small"
                  style={{
                    padding: 16,
                    border: `2px solid ${statusColors.border}`,
                    background: statusColors.bg,
                  }}
                >
                  {isEditing ? (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <strong style={{ fontSize: 14 }}>Editing Leave Request</strong>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                            Leave Type
                          </label>
                          <select
                            className="input"
                            value={editingLeave.leave_type}
                            onChange={(e) => setEditingLeave({ ...editingLeave, leave_type: e.target.value })}
                            style={{ fontSize: 13 }}
                          >
                            <option>Sick</option>
                            <option>Planned</option>
                            <option>LOP</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                            Start Date
                          </label>
                          <input
                            className="input"
                            type="date"
                            value={editingLeave.start_date}
                            onChange={(e) => setEditingLeave({ ...editingLeave, start_date: e.target.value })}
                            style={{ fontSize: 13 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                            End Date
                          </label>
                          <input
                            className="input"
                            type="date"
                            value={editingLeave.end_date}
                            onChange={(e) => setEditingLeave({ ...editingLeave, end_date: e.target.value })}
                            style={{ fontSize: 13 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                            Reason
                          </label>
                          <input
                            className="input"
                            value={editingLeave.reason}
                            onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                            style={{ fontSize: 13 }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={updateLeave}
                          disabled={loading}
                          style={{
                            flex: 1,
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            padding: "8px",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {loading ? "Saving..." : "💾 Save Changes"}
                        </button>
                        <button
                          onClick={() => setEditingLeave(null)}
                          style={{
                            flex: 1,
                            background: "#6b7280",
                            color: "white",
                            border: "none",
                            padding: "8px",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 20 }}>
                              {h.leave_type === "Sick" ? "🤒" : h.leave_type === "Planned" ? "📅" : "📋"}
                            </span>
                            <strong style={{ fontSize: 16 }}>{h.leave_type} Leave</strong>
                          </div>
                          <div className="muted" style={{ fontSize: 13 }}>
                            {formatDate(h.start_date)} to {formatDate(h.end_date)}
                          </div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                            {h.days} {h.days === 1 ? "day" : "days"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            className="badge"
                            style={{
                              background: statusColors.text,
                              color: "white",
                              fontWeight: 600,
                              padding: "6px 12px",
                              marginBottom: 8,
                            }}
                          >
                            {h.status}
                          </div>
                          {isPending && (
                          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>

                            {/* EDIT BUTTON */}
                            <button
                              onClick={() =>
                                setEditingLeave({
                                  _id: h._id,
                                  leave_type: h.leave_type,
                                  start_date: h.start_date,
                                  end_date: h.end_date,
                                  reason: h.reason || "",
                                })
                              }
                              style={{
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              ✏️ Edit
                            </button>

                            {/* CANCEL BUTTON */}
                            <button
                              onClick={() => cancelLeave(h._id)}
                              style={{
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        )}
                          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                            Applied: {formatDate(h.applied_on)}
                          </div>
                        </div>
                      </div>

                      {h.reason && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: "rgba(255, 255, 255, 0.7)",
                            borderRadius: 6,
                            fontSize: 13,
                          }}
                        >
                          <strong>Reason:</strong> {h.reason}
                        </div>
                      )}

                      {h.rejection_reason && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: "#fef2f2",
                            borderRadius: 6,
                            fontSize: 13,
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                          }}
                        >
                          <strong>✗ Rejection Reason:</strong> {h.rejection_reason}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: message.includes("Error") || message.includes("⚠️") ? "#fef2f2" : "#d1f4dd",
            color: message.includes("Error") || message.includes("⚠️") ? "#ef4444" : "#0a5d2c",
            padding: "16px 24px",
            borderRadius: 12,
            border: `2px solid ${message.includes("Error") || message.includes("⚠️") ? "#ffb3b3" : "#7de3a6"}`,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            fontSize: 14,
            fontWeight: 600,
            zIndex: 1000,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaves;