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

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSection("dashboard");
    setViewEmployeeId(null);
  };

  const handleNavigateToProfile = (employeeId) => {
    setViewEmployeeId(employeeId);
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
        // Role-specific dashboards
        if (role === "Admin") {
          // ⬇️ CHANGE: use AdminDashboard
          return <AdminDashboard user={currentUser} />;
        } else if (role === "Manager") {
          return <ManagerDashboard user={currentUser} onNavigateToProfile={handleNavigateToProfile} />;
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
          onNavigateToProfile={() => handleNavigateToProfile(null)}
        />
        <div className="content">{renderSection()}</div>
      </div>
    </div>
  );
}

export default App;