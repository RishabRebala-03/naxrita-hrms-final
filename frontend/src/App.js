// src/App.js
import React, { useState } from "react";
import "./App.css";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import UserForm from "./components/UserForm";
import UserList from "./components/UserList";
import ManagerInfo from "./components/ManagerInfo";
import Profile from "./components/Profile";
import Calendar from "./components/Calendar";
// ⬇️ CHANGE: import the default export as AdminDashboard
import AdminDashboard from "./components/Dashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import EmployeeList from "./components/EmployeeList";
import EmployeeLeaves from "./components/EmployeeLeaves";
import ManagerLeaves from "./components/ManagerLeaves";
import ProgressTracker from "./components/ProgressTracker";
import AdminLeaves from "./components/AdminLeaves";
import AdminHolidays from "./components/AdminHolidays";
import AdminApplyLeave from "./components/AdminApplyLeave";
import AdminLogs from "./components/AdminLogs";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [section, setSection] = useState("dashboard");
  const [viewEmployeeId, setViewEmployeeId] = useState(null);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setSection("dashboard");
  };

  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSection("dashboard");
    setViewEmployeeId(null);
  };

  // REPLACE the handleNavigateToProfile function in App.js (around line 24)
  const handleNavigateToProfile = (employeeId) => {
    console.log("🔍 Navigation requested with:", employeeId);
    console.log("   Type:", typeof employeeId);
    
    let targetId = employeeId;
    
    // Safety check 1: Handle undefined/null
    if (!employeeId) {
      console.error("❌ No employee ID provided");
      alert("Error: No employee ID provided");
      return;
    }
    
    // Safety check 2: Handle object case
    if (typeof employeeId === "object" && employeeId !== null) {
      console.warn("⚠️ Object passed to navigation, extracting ID...");
      console.log("   Object keys:", Object.keys(employeeId));
      console.log("   Full object:", JSON.stringify(employeeId, null, 2));
      
      // Try to extract ID from common properties
      targetId = employeeId._id || 
                employeeId.id || 
                employeeId.employeeId ||
                null;
      
      if (targetId) {
        console.log("✅ Extracted ID from object:", targetId);
      } else {
        console.error("❌ Could not extract ID from object");
        alert("Error: Invalid employee ID (object without _id property)");
        return;
      }
    }
    
    // Safety check 3: Ensure it's a string after extraction
    if (typeof targetId !== "string") {
      console.error("❌ targetId is not a string:", targetId, "Type:", typeof targetId);
      alert("Error: Invalid employee ID format (not a string)");
      return;
    }
    
    // Safety check 4: Check for stringified objects
    if (targetId === "[object Object]" || targetId.includes("[object")) {
      console.error("❌ targetId is a stringified object:", targetId);
      alert("Error: Invalid employee ID (stringified object)");
      return;
    }
    
    // Safety check 5: Validate MongoDB ObjectId format (24 hex characters)
    if (!/^[a-f0-9]{24}$/i.test(targetId)) {
      console.error("❌ Invalid MongoDB ObjectId format:", targetId);
      alert(`Error: Invalid employee ID format. Expected 24 hex characters, got: ${targetId}`);
      return;
    }
    
    // All checks passed - navigate
    console.log("✅ All validations passed, navigating to profile:", targetId);
    setViewEmployeeId(targetId);
    setSection("profile");
  };

  const handleSectionChange = (newSection) => {
    if (
      newSection === "profile" ||
      newSection === "leaves" ||
      newSection === "employees" ||
      newSection === "progress"
    ) {
      setViewEmployeeId(null);
    }
    setSection(newSection);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const role = currentUser?.role || "Employee";

  const getFilteredSidebar = () => {
    switch (role) {
      case "Admin":
        return <Sidebar section={section} setSection={handleSectionChange} role="Admin" />;
      case "Manager":
        return (
          <Sidebar
            section={section}
            setSection={handleSectionChange}
            role="Manager"
            restricted={["add", "holidays"]}
          />
        );
      case "Employee":
      default:
        return (
          <Sidebar
            section={section}
            setSection={handleSectionChange}
            role="Employee"
            restricted={["add", "employees", "holidays"]}
          />
        );
    }
  };

  const renderSection = () => {
    switch (section) {
      case "dashboard":
        if (role === "Admin") {
          return <AdminDashboard user={currentUser} />;
        } else if (role === "Manager") {
          return (
            <ManagerDashboard 
              user={currentUser} 
              onNavigateToProfile={handleNavigateToProfile} // ✅ Safe handler
            />
          );
        } else {
          return <EmployeeDashboard user={currentUser} setSection={handleSectionChange} />;
        }

      case "progress":
        return <ProgressTracker user={currentUser} />;

      case "add":
        return role === "Admin" ? <UserForm /> : <AccessDenied />;

      case "users":
        return role === "Admin" ? <UserList /> : <AccessDenied />;

      case "manager":
        return role === "Admin" ? <ManagerInfo /> : <AccessDenied />;

      case "holidays":
        return role === "Admin" ? <AdminHolidays /> : <AccessDenied />;

      case "apply-behalf":
        return role === "Admin" ? <AdminApplyLeave user={currentUser} /> : <AccessDenied />;

      case "logs":
        return role === "Admin" ? <AdminLogs user={currentUser} /> : <AccessDenied />;

      case "employees":
        if (role === "Admin") {
          return (
            <EmployeeList
              user={currentUser}
              onNavigateToProfile={handleNavigateToProfile}
              isAdmin={true}
            />
          );
        } else if (role === "Manager") {
          return <EmployeeList user={currentUser} onNavigateToProfile={handleNavigateToProfile} />;
        }
        return <AccessDenied />;

      case "leaves":
        if (role === "Admin") {
          return <AdminLeaves user={currentUser} />;
        } else if (role === "Manager") {
          return <ManagerLeaves user={currentUser} />;
        } else {
          return <EmployeeLeaves user={currentUser} />;
        }

      case "profile":
        return <Profile user={currentUser} role={role} viewEmployeeId={viewEmployeeId} />;

      case "calendar":
        return <Calendar user={currentUser} />;

      default:
        // Default to dashboard
        if (role === "Admin") {
          // ⬇️ CHANGE: use AdminDashboard
          return <AdminDashboard user={currentUser} />;
        } else if (role === "Manager") {
          return <ManagerDashboard user={currentUser} onNavigateToProfile={handleNavigateToProfile} />;
        } else {
          return <EmployeeDashboard user={currentUser} />;
        }
    }
  };

  const AccessDenied = () => (
    <div style={{ padding: 40, color: "#ef4444" }}>
      <h2>🚫 Access Denied</h2>
      <p>You do not have permission to access this section.</p>
    </div>
  );

  return (
    <div className="app-root">
      {getFilteredSidebar()}
      <div className="main">
        <Topbar
          user={currentUser}
          onLogout={handleLogout}
          onNavigateToProfile={handleNavigateToProfile} // ✅ Use same safe handler
        />
        <div className="content">{renderSection()}</div>
      </div>
    </div>
  );
}

export default App;