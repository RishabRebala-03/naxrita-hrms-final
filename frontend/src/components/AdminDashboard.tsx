import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import TestBuilder from './TestBuilder';
import TestList from './TestList';
import './AdminDashboard.css';
import { apiGet } from '../services/api';

type AdminView = 'dashboard' | 'users' | 'create-test' | 'tests';

interface AdminDashboardProps {
  adminName: string;
  onLogout: () => void;
}

interface DashboardStats {
  totalUsers: number;
  activeTests: number;
  completedTests: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminName, onLogout }) => {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeTests: 0,
    completedTests: 0,
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  useEffect(() => {
    if (currentView === 'dashboard') {
      loadStats();
    }
  }, [currentView]);

  const loadStats = async () => {
    try {
      const res = await apiGet<DashboardStats>('/admin/dashboard-stats');
      setStats(res);
    } catch (e) {
      console.error('Failed to load dashboard stats:', e);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'users':
        return <UserManagement />;
      case 'create-test':
        return <TestBuilder onBack={() => setCurrentView('tests')} />;
      case 'tests':
        return <TestList onCreateNew={() => setCurrentView('create-test')} />;
      default:
        return (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <span className="dashboard-title">Admin Portal</span>
              </div>
              <div className="dashboard-topbar-right">
                {today}
              </div>
            </div>

            <div className="dashboard-home">
              <h2>Welcome, {adminName} 👋</h2>
              <p className="subtitle">Manage tests, users, and monitor system performance</p>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>Total Users</h3>
                    <p className="stat-number">{stats.totalUsers}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📝</div>
                  <div className="stat-info">
                    <h3>Active Tests</h3>
                    <p className="stat-number">{stats.activeTests}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <h3>Completed Tests</h3>
                    <p className="stat-number">{stats.completedTests}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <img
            src="/assets/emax-logo.png"
            alt="Emax Technologies"
            className="sidebar-logo"
            style={{ height: '56px', maxWidth: '140px', objectFit: 'contain', display: 'block', marginBottom: '0.75rem' }}
          />
          <span className="admin-badge">Admin</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </button>
          <button
            className={`nav-item ${currentView === 'users' ? 'active' : ''}`}
            onClick={() => setCurrentView('users')}
          >
            <span className="nav-icon">👥</span>
            Users
          </button>
          <button
            className={`nav-item ${currentView === 'tests' ? 'active' : ''}`}
            onClick={() => setCurrentView('tests')}
          >
            <span className="nav-icon">📝</span>
            Tests
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{adminName.charAt(0).toUpperCase()}</div>
            <span className="user-name">{adminName}</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-main">
        {renderView()}
      </main>
    </div>
  );
};

export default AdminDashboard;