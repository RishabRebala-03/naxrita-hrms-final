import React, { useState } from 'react';
import './Login.css';
import { apiPost } from "../services/api";
import StudentRegistration from './StudentRegistration';

type UserRole = 'admin' | 'answerer';

interface LoginProps {
  onLogin: (role: UserRole, userId: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('answerer');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) return;
    setIsLoading(true);
    setLoginError('');
    try {
      const res = await apiPost<{ user: any }>("/auth/login", {
        userId,
        password,
        role: selectedRole,
      });
      onLogin(res.user.role, res.user.userId);
    }catch (err: any) {
      const msg: string = err?.message || err?.error || "";
      if (msg.toLowerCase().includes("inactive")) {
        setLoginError("Your account is inactive. Please contact your administrator to regain access.");
      } else {
        setLoginError("Invalid credentials. Please check your User ID and password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showRegister) {
    return (
      <StudentRegistration
        onBack={() => setShowRegister(false)}
        onSuccess={() => setShowRegister(false)}
      />
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo Section */}
        <div className="login-logo-container">
          <img
            src="/assets/emax-logo.png"
            alt="Emax Technologies"
            className="login-logo"
          />
        </div>

        {/* Header */}
        <div className="login-header">
          <h1 className="login-title">Online Exam Portal</h1>
          <p className="login-subtitle">Select your role and sign in to continue</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector">
          <button
            className={`role-btn ${selectedRole === 'answerer' ? 'active' : ''}`}
            onClick={() => {
              setSelectedRole('answerer');
              setLoginError('');
            }}
            type="button"
          >
            <span className="role-icon">👤</span>
            <span className="role-label">Test Taker</span>
          </button>
          <button
            className={`role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setSelectedRole('admin');
              setLoginError('');
            }}
            type="button"
          >
            <span className="role-icon">⚙️</span>
            <span className="role-label">Administrator</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {loginError && (
            <div className="login-error" role="alert">
              {loginError}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                if (loginError) setLoginError('');
              }}
              placeholder="Enter your user ID"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (loginError) setLoginError('');
              }}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Security Badge */}
        <div className="security-badge">
          <span className="security-icon">🔒</span>
          <span>Secure authentication</span>
        </div>

        {/* Footer — Register link only shown for Test Taker role */}
        <div className="login-footer">
          {selectedRole === 'answerer' ? (
            <p>
              New student?{' '}
              <button
                className="login-register-link"
                onClick={() => setShowRegister(true)}
                type="button"
              >
                Register here
              </button>
            </p>
          ) : (
            <p>Need help? <a href="#support">Contact support</a></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
