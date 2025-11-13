// src/components/Sidebar.js
import React from "react";

const Sidebar = ({ section, setSection, role, restricted = [] }) => {
  const buttons = [
    { key: "dashboard", label: "🏠 Dashboard", roles: ["Admin", "Manager", "Employee"] },
    { key: "employees", label: "👥 Employees", roles: ["Admin", "Manager"] },
    { key: "leaves", label: "📋 Leaves", roles: ["Admin", "Manager", "Employee"] },
    { key: "apply-behalf", label: "📝 Apply Leave on Behalf", roles: ["Admin"] },
  // { key: "progress", label: "📊 Progress", roles: ["Admin", "Manager", "Employee"] },
    { key: "add", label: "➕ Add Employee", roles: ["Admin"] },
    { key: "holidays", label: "🎉 Holidays", roles: ["Admin"] },
    { key: "calendar", label: "📅 Calendar", roles: ["Admin", "Manager", "Employee"] },
  ];

  const visibleButtons = buttons.filter((btn) => 
    !restricted.includes(btn.key) && 
    (!role || btn.roles.includes(role))
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "linear-gradient(135deg, #0ea5e9, #a855f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)",
          }}
        >
          <strong style={{ color: "white", fontSize: 18 }}>N</strong>
        </div>
        <div>
          <h1
            style={{
              background: "linear-gradient(135deg, #0ea5e9, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 700,
            }}
          >
            NAXRITA
          </h1>
          <div style={{ fontSize: 12, color: "#6b7280" }}>HR Portal</div>
        </div>
      </div>

      <nav className="nav" style={{ marginTop: 18 }}>
        {visibleButtons.map((btn) => (
          <button
            key={btn.key}
            className={section === btn.key ? "active" : ""}
            onClick={() => setSection(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      <div className="footer">
        <div style={{ fontSize: 12 }}>© {new Date().getFullYear()} Naxrita</div>
        <div style={{ fontSize: 12, color: "#9aa4b2", marginTop: 6 }}>
          v1.0 • HR System
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;