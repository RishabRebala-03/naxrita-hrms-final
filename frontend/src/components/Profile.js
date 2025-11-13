import React, { useState, useEffect } from "react";

const Profile = ({ user, role, viewEmployeeId = null }) => {
  const [employeeId, setEmployeeId] = useState("");
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");

  // Helper function to format date properly
  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    try {
      let date;

      if (typeof dateValue === "string") {
        date = new Date(dateValue.replace("Z", "").replace(/\.\d{3}/, ""));
      } else if (dateValue.$date) {
        date = new Date(dateValue.$date);
      } else {
        date = new Date(dateValue);
      }

      if (isNaN(date.getTime())) {
        return "N/A";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "N/A";
    }
  };

  // Helper to convert date to YYYY-MM-DD format for input
  const dateToInputFormat = (dateValue) => {
    if (!dateValue) return "";

    try {
      let date;
      if (typeof dateValue === "string") {
        date = new Date(dateValue.replace("Z", "").replace(/\.\d{3}/, ""));
      } else if (dateValue.$date) {
        date = new Date(dateValue.$date);
      } else {
        date = new Date(dateValue);
      }

      if (isNaN(date.getTime())) return "";

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      return "";
    }
  };

  const fetchProfile = async (userId) => {
    if (!userId) {
      setMessage("No user ID provided");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}`);

      if (!res.ok) {
        const error = await res.json();
        setMessage(error.error || "Employee not found");
        setProfile(null);
        setLoading(false);
        return;
      }

      const data = await res.json();  // Make sure this line exists
      setProfile(data);
      setEditForm({
        name: data.name || "",
        email: data.email || "",
        designation: data.designation || "",
        department: data.department || "",
        shiftTimings: data.shiftTimings || "",
        dateOfJoining: dateToInputFormat(data.dateOfJoining),
        dateOfBirth: dateToInputFormat(data.dateOfBirth),  // This should work now
        projects: Array.isArray(data.projects) ? data.projects.join(", ") : "",
        reportsToEmail: data.reportsToEmail || "",
      });
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  // Auto-load profile based on context
  useEffect(() => {
    if (viewEmployeeId) {
      setEmployeeId(viewEmployeeId);
      fetchProfile(viewEmployeeId);
    } else if (user?.id) {
      setEmployeeId(user.id);
      fetchProfile(user.id);
    }
  }, [viewEmployeeId, user]);

  const handleManualFetch = () => {
    if (!employeeId.trim()) {
      setMessage("Please enter Employee ID");
      return;
    }
    fetchProfile(employeeId);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      name: profile.name || "",
      email: profile.email || "",
      designation: profile.designation || "",
      department: profile.department || "",
      shiftTimings: profile.shiftTimings || "",
      dateOfJoining: dateToInputFormat(profile.dateOfJoining),
      dateOfBirth: dateToInputFormat(profile.dateOfBirth),
      projects: Array.isArray(profile.projects)
        ? profile.projects.join(", ")
        : "",
      reportsToEmail: profile.reportsToEmail || "",
    });
    setMessage("");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        name: editForm.name,
        email: editForm.email,
        designation: editForm.designation,
        department: editForm.department,
        shiftTimings: editForm.shiftTimings,
        projects: editForm.projects
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p),
        reportsToEmail: editForm.reportsToEmail || "", 
      };

      if (editForm.dateOfJoining) {
        updateData.dateOfJoining = new Date(
          editForm.dateOfJoining
        ).toISOString();
      }

      // NEW FIELD - Date of Birth
      if (editForm.dateOfBirth) {
        updateData.dateOfBirth = new Date(
          editForm.dateOfBirth
        ).toISOString();
      }

      // ADD THIS DEBUG LINE
      console.log("📤 Sending update data:", updateData);
      console.log("📅 DOB from form:", editForm.dateOfBirth);

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/update_user/${employeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("Profile updated successfully ✓");
        setIsEditing(false);
        fetchProfile(employeeId);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.error || "Failed to update"));
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text || "");
    setMessage(`${label} copied to clipboard`);
    setTimeout(() => setMessage(""), 2000);
  };

  // Password change handlers
  const handlePasswordChange = async () => {
    setPasswordError("");
    
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/update_user/${employeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: passwordForm.newPassword,
            currentPassword: passwordForm.currentPassword // For verification
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("Password changed successfully ✓");
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setMessage(""), 3000);
      } else {
        setPasswordError(data.error || "Failed to change password");
      }
    } catch (err) {
      console.error(err);
      setPasswordError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Determine if this is own profile or viewing someone else's
  const isOwnProfile = user?.id === employeeId;
  const canEdit = role === "Admin" || isOwnProfile;
  const showSearch = role === "Admin" && !viewEmployeeId;

  return (
    <div className="panel">
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>
          {viewEmployeeId
            ? "Employee Profile"
            : isOwnProfile
            ? "My Profile"
            : "Employee Profile"}
        </h3>
        <p className="muted">
          {viewEmployeeId
            ? "Viewing team member profile"
            : isOwnProfile
            ? "View and manage your personal information"
            : "View and manage employee information"}
        </p>
      </div>

      {/* Profile Display */}
      {profile && !isEditing && (
        <div style={{ marginTop: 20 }}>
          {/* Header Card */}
          <div
            className="card"
            style={{
              padding: 24,
              marginBottom: 20,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    fontWeight: 700,
                    border: "3px solid rgba(255, 255, 255, 0.3)",
                  }}
                >
                  {profile.name?.charAt(0) || "E"}
                </div>
                <div>
                  <h2 style={{ margin: 0, marginBottom: 8, fontSize: 28 }}>
                    {profile.name}
                  </h2>
                  <div style={{ fontSize: 16, opacity: 0.95, marginBottom: 4 }}>
                    {profile.designation}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.85 }}>
                    {profile.department || "No Department"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {profile.role}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 20,
            }}
          >
            {/* Contact Information */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>
                Contact Information
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div>
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 4 }}
                  >
                    Email
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ flex: 1, wordBreak: "break-all" }}>
                      {profile.email}
                    </span>
                    <button
                      className="btn ghost"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={() => copyToClipboard(profile.email, "Email")}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Employee ID
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ 
                      fontFamily: "monospace", 
                      fontSize: 13, 
                      wordBreak: "break-all",
                      fontWeight: 600,
                      color: "#667eea"
                    }}>
                      {profile.employeeId || profile._id}
                    </span>
                    <button
                      className="btn ghost"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={() => copyToClipboard(profile.employeeId || profile._id, "Employee ID")}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>
                Work Information
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div>
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 4 }}
                  >
                    Shift Timings
                  </div>
                  <div>{profile.shiftTimings || "Not Set"}</div>
                </div>
                
                <div>
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 4 }}
                  >
                    Date of Birth
                  </div>
                  <div>{formatDate(profile.dateOfBirth)}</div>
                </div>

                <div>
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 4 }}
                  >
                    Date of Joining
                  </div>
                  <div>{formatDate(profile.dateOfJoining)}</div>
                  <br></br>
                  {profile.reportsToEmail && ( 
                  <div> 
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Reports To</div> 
                    <div>{profile.reportsToEmail}</div> 
                  </div>
                  )} 
                </div>
                <br></br>
              </div>
            </div>

            {/* Projects */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>Projects</h4>
              {profile.projects && profile.projects.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {profile.projects.map((proj, idx) => (
                    <span
                      key={idx}
                      className="badge"
                      style={{
                        background: "#e6f0ff",
                        color: "#1f6feb",
                        padding: "6px 12px",
                        fontSize: 13,
                      }}
                    >
                      {proj}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="muted">No projects assigned</div>
              )}
            </div>

            {/* Leave Balance */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 16 }}>Leave Balance</h4>
              {profile.leaveBalance ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>Sick</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>
                      {profile.leaveBalance.sick || 0}
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>Planned</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>
                      {profile.leaveBalance.planned || 0}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="muted">No leave balance data</div>
              )}
            </div>
          </div>

          {/* Action Buttons - Only show if user can edit */}
          {canEdit && (
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button className="btn" onClick={handleEdit}>
                ✏️ Edit Profile
              </button>
              {isOwnProfile && (
                <button 
                  className="btn ghost" 
                  onClick={() => setShowPasswordModal(true)}
                  style={{ 
                    border: "2px solid #667eea",
                    color: "#667eea"
                  }}
                >
                  🔒 Change Password
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Mode */}
      {profile && isEditing && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ marginBottom: 16 }}>Edit Profile Information</h4>

          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Full Name *
              </label>
              <input
                className="input"
                value={editForm.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Full Name"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Email *
              </label>
              <input
                className="input"
                type="email"
                value={editForm.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Email"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Designation *
              </label>
              <input
                className="input"
                value={editForm.designation}
                onChange={(e) =>
                  handleInputChange("designation", e.target.value)
                }
                placeholder="Designation"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Department
              </label>
              <input
                className="input"
                value={editForm.department}
                onChange={(e) =>
                  handleInputChange("department", e.target.value)
                }
                placeholder="Department"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Shift Timings
              </label>
              <input
                className="input"
                value={editForm.shiftTimings}
                onChange={(e) =>
                  handleInputChange("shiftTimings", e.target.value)
                }
                placeholder="e.g., 9:00 AM - 6:00 PM"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Date of Joining
              </label>
              <input
                className="input"
                type="date"
                value={editForm.dateOfJoining}
                onChange={(e) =>
                  handleInputChange("dateOfJoining", e.target.value)
                }
              />
            </div>

            <div>
            <label
              style={{
                fontSize: 12,
                color: "#6b7280",
                display: "block",
                marginBottom: 4,
              }}
            >
              Date of Birth
            </label>
            <input
              className="input"
              type="date"
              value={editForm.dateOfBirth}
              onChange={(e) =>
                handleInputChange("dateOfBirth", e.target.value)
              }
              max={new Date().toISOString().split('T')[0]}
            />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Projects (comma-separated)
              </label>
              <input
                className="input"
                value={editForm.projects}
                onChange={(e) => handleInputChange("projects", e.target.value)}
                placeholder="Project A, Project B, Project C"
              />
            </div>
          </div>

          <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Manager's Email (Reports To)
              </label>
              <input
                className="input"
                type="email"
                value={editForm.reportsToEmail || ""}
                onChange={(e) => handleInputChange("reportsToEmail", e.target.value)}
                placeholder="manager@example.com"
              />
          </div>

          <br></br>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn"
              onClick={handleSave}
              disabled={
                loading ||
                !editForm.name ||
                !editForm.email ||
                !editForm.designation
              }
            >
              {loading ? "Saving..." : "💾 Save Changes"}
            </button>
            <button
              className="btn ghost"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => {
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordError("");
          }}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 16,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 22 }}>
              🔒 Change Password
            </h3>
            <p style={{ marginBottom: 24, fontSize: 14, color: "#6b7280" }}>
              Enter your current password and choose a new one
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  Current Password *
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  New Password *
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  Confirm New Password *
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>

              {passwordError && (
                <div
                  style={{
                    padding: 12,
                    background: "#fef2f2",
                    borderRadius: 8,
                    color: "#ef4444",
                    fontSize: 14,
                    border: "1px solid #fecaca",
                  }}
                >
                  {passwordError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <button
                className="btn ghost"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPasswordError("");
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handlePasswordChange}
                disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                style={{
                  background: loading ? "#cbd5e1" : "#667eea",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background:
              message.includes("Error") || message.includes("Failed")
                ? "#fef2f2"
                : "#e6f0ff",
            borderRadius: 8,
            color:
              message.includes("Error") || message.includes("Failed")
                ? "#ef4444"
                : "#1f6feb",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {/* Loading State */}
      {loading && !profile && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#9ca3af",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 16 }}>Loading profile...</div>
        </div>
      )}
    </div>
  );
};

export default Profile;