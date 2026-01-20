import React, { useState } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import TestInterface from './components/TestInterface';
import { sampleTest } from './components/sampleTestData';
import AnswererDashboard from './components/AnswererDashboard';
import './App.css';

type UserRole = 'admin' | 'answerer';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('');

  const handleLogin = (role: UserRole, userId: string) => {
    setCurrentRole(role);
    setCurrentUser(userId);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentRole(null);
    setCurrentUser('');
  };

  const handleTestSubmit = () => {
    console.log('Test submitted!');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentRole === 'admin') {
    return <AdminDashboard adminName={currentUser} onLogout={handleLogout} />;
  }

  // Test taker interface
  return (
    <AnswererDashboard
      userName={currentUser}
      onLogout={handleLogout}
    />
  );
}

export default App;