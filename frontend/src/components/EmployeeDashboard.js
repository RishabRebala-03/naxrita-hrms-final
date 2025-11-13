// src/components/EmployeeDashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import OrganizationHierarchy from "./OrganizationHierarchy";
import LeaveStatusDot from './LeaveStatusDot';

const EmployeeDashboard = ({ user, setSection }) => {

  const [stats, setStats] = useState({
    totalLeaves: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
  });

  const [leaveBalance, setLeaveBalance] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [managerInfo, setManagerInfo] = useState(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [showHierarchy, setShowHierarchy] = useState(false);

  const fetchEmployeeData = async () => {
    try {
      // Fetch leave balance
      const balanceRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/balance/${user.id}`
      );
      setLeaveBalance(balanceRes.data);

      // Fetch leave history
      const historyRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/leaves/history/${user.id}`
      );
      const leaves = historyRes.data;

      // Calculate stats
      const pending = leaves.filter((l) => l.status === "Pending").length;
      const approved = leaves.filter((l) => l.status === "Approved").length;
      const rejected = leaves.filter((l) => l.status === "Rejected").length;

      setStats({
        totalLeaves: leaves.length,
        pendingLeaves: pending,
        approvedLeaves: approved,
        rejectedLeaves: rejected,
      });

      // Get recent 5 leaves
      setRecentLeaves(leaves.slice(0, 5));

      // Fetch manager info
      try {
        const managerRes = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/users/get_manager/${user.id}`
        );
        setManagerInfo(managerRes.data);
      } catch (err) {
        console.log("No manager assigned");
      }

      // Set upcoming holidays (next 3 from today)
      // Fetch admin-defined holidays
      try {
        const holidaysRes = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/holidays/`);
        const allHolidays = holidaysRes.data;
        
        // Filter upcoming holidays (from today onwards)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcoming = allHolidays
          .filter(h => new Date(h.date) >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3); // Get next 3 upcoming holidays
        
        setUpcomingHolidays(upcoming);
      } catch (err) {
        console.log("Could not fetch holidays:", err);
        setUpcomingHolidays([]);
      }
    } catch (err) {
      console.error("Error loading employee dashboard:", err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchEmployeeData();
    }
  }, [user]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return { bg: "#d1f4dd", text: "#0a5d2c", border: "#7de3a6" };
      case "Rejected":
        return { bg: "#ffe0e0", text: "#c41e3a", border: "#ffb3b3" };
      default:
        return { bg: "#fff4e6", text: "#d97706", border: "#fbbf24" };
    }
  };

  const totalBalance = leaveBalance 
    ? leaveBalance.sick + leaveBalance.planned 
    : 0;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header Section */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 16,
              padding: "28px 32px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <h1
                  style={{
                    margin: 0,
                    marginBottom: 8,
                    fontSize: 32,
                    fontWeight: 700,
                    color: "white",
                    textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  Welcome back, {user?.name?.split(" ")[0] || "Employee"} 👋
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: 4,
                  }}
                >
                  {user?.designation} • {user?.department}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "rgba(255, 255, 255, 0.75)",
                  }}
                >
                  {today}
                </p>
              </div>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.8)", marginBottom: 4 }}>
                  Total Leave Balance
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: "white", textAlign: "center" }}>
                  {totalBalance}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Banner Section */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              background: "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              position: "relative",
              height: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            }}
          >
            {/* Placeholder Content */}
            <div style={{ textAlign: "center", padding: 40 }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  margin: "0 auto 20px",
                  borderRadius: "50%",
                  background: "rgba(102, 126, 234, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px dashed #667eea",
                }}
              >
                <span style={{ fontSize: 48 }}>🎉</span>
              </div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                Festival & Announcements Banner
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#6b7280",
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                This space is reserved for upcoming festivals, special announcements, and company celebrations
              </p>
            </div>

            {/* Corner Badge */}
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "rgba(102, 126, 234, 0.9)",
                color: "white",
                padding: "8px 16px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              📢 Coming Soon
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Leave Balance Cards - UPDATE THIS SECTION */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {leaveBalance && (
                <>
                  {/* Sick Leave Card */}
                  <div
                    style={{
                      background: "white",
                      borderRadius: 16,
                      padding: "24px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                      border: "2px solid #fca5a5",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        opacity: 0.1,
                      }}
                    />
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🤒</div>
                    <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                      Sick Leave
                    </div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>
                      {leaveBalance.sick}
                    </div>
                    <div style={{ 
                      padding: "8px 12px", 
                      background: "#fef2f2", 
                      borderRadius: 8,
                      border: "1px solid #fca5a5"
                    }}>
                      <div style={{ fontSize: 11, color: "#991b1b", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>Total Allocated</span>
                        <strong>{leaveBalance.sickTotal || 6}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#991b1b", display: "flex", justifyContent: "space-between" }}>
                        <span>Booked/Used</span>
                        <strong>{(leaveBalance.sickTotal || 6) - leaveBalance.sick}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Planned Leave Card */}
                  <div
                    style={{
                      background: "white",
                      borderRadius: 16,
                      padding: "24px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                      border: "2px solid #93c5fd",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                        opacity: 0.1,
                      }}
                    />
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                    <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                      Planned Leave
                    </div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: "#3b82f6", marginBottom: 8 }}>
                      {leaveBalance.planned}
                    </div>
                    <div style={{ 
                      padding: "8px 12px", 
                      background: "#eff6ff", 
                      borderRadius: 8,
                      border: "1px solid #93c5fd"
                    }}>
                      <div style={{ fontSize: 11, color: "#1e40af", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>Total Allocated</span>
                        <strong>{leaveBalance.plannedTotal || 12}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#1e40af", display: "flex", justifyContent: "space-between" }}>
                        <span>Booked/Used</span>
                        <strong>{(leaveBalance.plannedTotal || 12) - leaveBalance.planned}</strong>
                      </div>
                    </div>
                  </div>

                  {/* LWP Card */}
                  <div
                    style={{
                      background: "white",
                      borderRadius: 16,
                      padding: "24px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                      border: "2px solid #fcd34d",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        opacity: 0.1,
                      }}
                    />
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                      Leave Without Pay
                    </div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>
                      {leaveBalance.lwp || 0}
                    </div>
                    <div style={{ 
                      padding: "8px 12px", 
                      background: "#fffbeb", 
                      borderRadius: 8,
                      border: "1px solid #fcd34d"
                    }}>
                      <div style={{ fontSize: 11, color: "#92400e", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>Total Allocated</span>
                        <strong>∞</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#92400e", display: "flex", justifyContent: "space-between" }}>
                        <span>Used</span>
                        <strong>{leaveBalance.lwp || 0}</strong>
                      </div>
                  </div>
                </div>
              </>
            )}
          </div>

{/* LOP Card - Full Width Below */}
{leaveBalance && (
  <div
    style={{
      background: "white",
      borderRadius: 16,
      padding: "20px 24px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
      border: "2px solid #fcd34d",
      marginTop: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ fontSize: 36 }}>📋</div>
      <div>
        <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>
          Loss Of Pay (LOP)
        </div>
        <div style={{ fontSize: 12, color: "#92400e", marginTop: 2 }}>
          Unlimited availability • Used: {leaveBalance.lwp || 0} days
        </div>
      </div>
    </div>
    <div style={{ fontSize: 36, fontWeight: 700, color: "#f59e0b" }}>
      {leaveBalance.lwp || 0}
    </div>
  </div>
)}
            {/* Recent Leave Applications */}
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "28px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>
                  Recent Applications
                </h3>
                <span style={{ fontSize: 14, color: "#6b7280" }}>
                  Last {recentLeaves.length} requests
                </span>
              </div>

              {recentLeaves.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "#9ca3af",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>No leave applications yet</div>
                  <div style={{ fontSize: 14, marginTop: 8 }}>Your leave history will appear here</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {recentLeaves.map((leave) => {
                    const statusColors = getStatusColor(leave.status);
                    return (
                      <div
                        key={leave._id}
                        style={{
                          padding: 20,
                          background: statusColors.bg,
                          borderRadius: 12,
                          border: `2px solid ${statusColors.border}`,
                          transition: "all 0.2s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                              <span style={{ fontSize: 24 }}>
                                {leave.leave_type === "Sick" ? "🤒" : leave.leave_type === "Planned" ? "📅" : "📋"}
                              </span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                                  {leave.leave_type} Leave
                                </div>
                                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                                  {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span>⏱️</span>
                                <span style={{ color: "#6b7280" }}>
                                  {leave.days} {leave.days === 1 ? "day" : "days"}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span>📅</span>
                                <span style={{ color: "#6b7280" }}>
                                  Applied {formatDate(leave.applied_on)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "6px 16px",
                              borderRadius: 8,
                              background: statusColors.text,
                              color: "white",
                              fontSize: 13,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {leave.status}
                          </div>
                        </div>
                        {leave.reason && (
                          <div
                            style={{
                              padding: 12,
                              background: "rgba(255, 255, 255, 0.7)",
                              borderRadius: 8,
                              fontSize: 13,
                              color: "#374151",
                              fontStyle: "italic",
                              marginBottom: leave.rejection_reason ? 8 : 0,
                            }}
                          >
                            <strong>Reason:</strong> {leave.reason}
                          </div>
                        )}
                        {leave.rejection_reason && (
                          <div
                            style={{
                              padding: 12,
                              background: "rgba(220, 38, 38, 0.1)",
                              borderRadius: 8,
                              fontSize: 13,
                              color: "#dc2626",
                              border: "1px solid rgba(220, 38, 38, 0.3)",
                            }}
                          >
                            <strong>❌ Rejection Reason:</strong> {leave.rejection_reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Quick Stats */}
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "28px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: 20, fontSize: 18, fontWeight: 700, color: "#111827" }}>
                Leave Statistics
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      ⏳
                    </div>
                    <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>Pending</span>
                  </div>
                  <span style={{ fontSize: 24, fontWeight: 700, color: "#d97706" }}>
                    {stats.pendingLeaves}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      ✅
                    </div>
                    <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>Approved</span>
                  </div>
                  <span style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>
                    {stats.approvedLeaves}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      ❌
                    </div>
                    <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>Rejected</span>
                  </div>
                  <span style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>
                    {stats.rejectedLeaves}
                  </span>
                </div>
              </div>
            </div>

            {/* Manager Info */}
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "28px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => setShowHierarchy(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
              }}
            >
              <h3 style={{ margin: 0, marginBottom: 20, fontSize: 18, fontWeight: 700, color: "#111827" }}>
                Reporting Manager
              </h3>
              {managerInfo ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ position: 'relative', width: 80, height: 80, margin: "0 auto 16px" }}>
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 36,
                        color: "white",
                        fontWeight: 700,
                      }}
                    >
                      {managerInfo.name?.charAt(0) || "M"}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'white', borderRadius: '50%', padding: 3 }}>
                      <LeaveStatusDot userId={managerInfo._id} size={14} />
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                    {managerInfo.name}
                  </div>
                  <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 2 }}>
                    {managerInfo.designation}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#9ca3af",
                      padding: "8px 12px",
                      background: "#f3f4f6",
                      borderRadius: 8,
                      marginTop: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {managerInfo.email}
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      padding: "8px 12px",
                      background: "#eff6ff",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#1e40af",
                      fontWeight: 500,
                    }}
                  >
                    🔍 Click to view organization hierarchy
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
                  <div style={{ fontSize: 14 }}>No manager assigned</div>
                  <div
                    style={{
                      marginTop: 12,
                      padding: "8px 12px",
                      background: "#eff6ff",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#1e40af",
                      fontWeight: 500,
                    }}
                  >
                    🔍 Click to view organization hierarchy
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Holidays */}
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "28px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: 20, fontSize: 18, fontWeight: 700, color: "#111827" }}>
                Upcoming Holidays
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {upcomingHolidays.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                    <div style={{ fontSize: 13 }}>No upcoming holidays</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {upcomingHolidays.map((holiday, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 14,
                          background: "#f9fafb",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                              {holiday.name}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              {formatDate(holiday.date)}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: holiday.type === "national" ? "#fee2e2" : "#fef3c7",
                              color: holiday.type === "national" ? "#991b1b" : "#92400e",
                              fontSize: 11,
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {holiday.type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 16,
                padding: "28px",
                boxShadow: "0 4px 20px rgba(102, 126, 234, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  marginBottom: 16,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                Quick Actions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => setSection && setSection("leaves")}
                  style={{
                    background: "white",
                    color: "#667eea",
                    border: "none",
                    padding: "14px 20px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span style={{ fontSize: 20 }}>📝</span>
                  <span>Apply for Leave</span>
                </button>
                <button
                  onClick={() => setSection && setSection("profile")}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    padding: "14px 20px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  }}
                >
                  <span style={{ fontSize: 20 }}>👤</span>
                  <span>View Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ADD THE HIERARCHY MODAL HERE - Right before the closing </div> tags */}
      {showHierarchy && (
        <OrganizationHierarchy 
          user={user} 
          onClose={() => setShowHierarchy(false)} 
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;