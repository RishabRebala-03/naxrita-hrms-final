// src/components/Notifications.js - WITH EVENT LISTENER FOR REFRESH
import React, { useState, useEffect } from "react";
import axios from "axios";

const Notifications = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const userId = currentUser?.id || currentUser?._id;
      if (!userId) return;

      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/${userId}`
      );
      
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    if (currentUser?.id || currentUser?._id) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      
      // ⭐ NEW: Listen for manual refresh events
      const handleRefresh = () => {
        console.log("🔔 Notification refresh triggered");
        fetchNotifications();
      };
      window.addEventListener('refreshNotifications', handleRefresh);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshNotifications', handleRefresh);
      };
    }
  }, [currentUser]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/mark_read/${notificationId}`
      );
      fetchNotifications();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const userId = currentUser?.id || currentUser?._id;
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/mark_all_read/${userId}`
      );
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/${notificationId}`
      );
      fetchNotifications();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "leave_approved":
        return "✅";
      case "leave_rejected":
        return "❌";
      case "leave_request":
        return "📋";
      case "leave_cancelled":
        return "🚫";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "leave_approved":
        return { bg: "#d1f4dd", border: "#7de3a6" };
      case "leave_rejected":
        return { bg: "#ffe0e0", border: "#ffb3b3" };
      case "leave_request":
        return { bg: "#e0f2fe", border: "#7dd3fc" };
      case "leave_cancelled":
        return { bg: "#fef3c7", border: "#fbbf24" };
      default:
        return { bg: "#f3f4f6", border: "#d1d5db" };
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "50%",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f9fafb";
          e.currentTarget.style.borderColor = "#d1d5db";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.borderColor = "#e5e7eb";
        }}
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#ef4444",
              color: "white",
              borderRadius: "50%",
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              border: "2px solid white",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowDropdown(false)}
          />

          {/* Notifications Panel */}
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 12px)",
              right: 0,
              width: 420,
              maxHeight: 600,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              zIndex: 1000,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                background: "#f9fafb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {unreadCount} unread
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#667eea",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  {loading ? "..." : "Mark all read"}
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                maxHeight: 500,
              }}
            >
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔕</div>
                  <div style={{ fontSize: 14 }}>No notifications yet</div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const colors = getNotificationColor(notif.type);
                  return (
                    <div
                      key={notif._id}
                      style={{
                        padding: 16,
                        borderBottom: "1px solid #f3f4f6",
                        background: notif.read ? "white" : "#fefce8",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (notif.read) e.currentTarget.style.background = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        if (notif.read) e.currentTarget.style.background = "white";
                      }}
                      onClick={() => {
                        if (!notif.read) {
                          markAsRead(notif._id);
                        }
                      }}
                    >
                      <div style={{ display: "flex", gap: 12 }}>
                        {/* Icon */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: colors.bg,
                            border: `2px solid ${colors.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            flexShrink: 0,
                          }}
                        >
                          {getNotificationIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: notif.read ? 400 : 600,
                              color: "#111827",
                              marginBottom: 4,
                              lineHeight: 1.4,
                            }}
                          >
                            {notif.message}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span>{formatTimestamp(notif.createdAt)}</span>
                            {!notif.read && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#ef4444",
                                }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif._id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#9ca3af",
                            cursor: "pointer",
                            fontSize: 16,
                            padding: 4,
                            lineHeight: 1,
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notifications;