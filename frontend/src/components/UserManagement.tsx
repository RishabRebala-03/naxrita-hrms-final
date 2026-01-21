import React, { useState, useEffect } from "react";
import "./UserManagement.css";
import { apiGet, apiPost, apiDelete } from "../services/api";

interface User {
  id: string;
  name: string;
  email: string;
  userId: string;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    userId: "",
    password: "",
  });

  useEffect(() => {
    apiGet<any>("/admin/users")
      .then((res) => {
        if (Array.isArray(res)) {
          setUsers(res);
        } else if (Array.isArray(res.users)) {
          setUsers(res.users);
        } else {
          console.error("Unexpected /admin/users response:", res);
          setUsers([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
        setUsers([]);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await apiPost<any>("/admin/users", {
        name: formData.name,
        email: formData.email,
        userId: formData.userId,
        password: formData.password,
        role: "answerer",
      });

      const createdUser: User = res.user ?? res;

      setUsers((prev) => [...prev, createdUser]);
      setShowForm(false);
      setFormData({ name: "", email: "", userId: "", password: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to create user");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this user?");
    if (!ok) return;

    try {
      await apiDelete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  };

  return (
    <div className="user-management" style={{ paddingTop: '2rem' }}>
      <div className="page-header">
        <h2>User Management</h2>
        <button className="primary-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>Create New Test Taker</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter email"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>User ID *</label>
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) =>
                    setFormData({ ...formData, userId: e.target.value })
                  }
                  placeholder="Enter user ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn">
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>User ID</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  No users created yet. Click "Add User" to create one.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.userId}</td>
                  <td>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;