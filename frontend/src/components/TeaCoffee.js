// src/components/TeaCoffee.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "../App.css";

const API_BASE = "http://localhost:5000/api/tea_coffee";

// ===========================================
// ⭐ BEAUTIFUL ADMIN UI FOR TEA/COFFEE ORDERS
// ===========================================

const AdminView = ({ dates, orders, formatDate }) => {

  const getStats = (date) => {
    const dayOrders = orders[date] || [];

    let morningTea = 0;
    let morningCoffee = 0;
    let eveningTea = 0;
    let eveningCoffee = 0;

    dayOrders.forEach((o) => {
      if (o.morning === "tea") morningTea++;
      if (o.morning === "coffee") morningCoffee++;
      if (o.evening === "tea") eveningTea++;
      if (o.evening === "coffee") eveningCoffee++;
    });

    return {
      morningTea,
      morningCoffee,
      eveningTea,
      eveningCoffee,
      total: dayOrders.length,
    };
  };

  const Metric = ({ label, value, color }) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color }}>{value}</div>
    </div>
  );

  const DayCard = ({ date, large = false }) => {
    const stats = getStats(date);
    const d = formatDate(date);

    return (
      <div
        style={{
          background: "white",
          padding: large ? 28 : 18,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: large ? 24 : 18, fontWeight: 700 }}>
            {d.full}
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{date}</div>
        </div>

        {/* Total Orders */}
        <div
          style={{
            marginBottom: 20,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Metric label="Total Orders" value={stats.total} color="#1f2937" />
        </div>

        {/* Morning & Evening Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          {/* Morning */}
          <div
            style={{
              padding: 14,
              background: "#f9fafb",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              ☀️ Morning
            </div>

            <Metric label="Tea" value={stats.morningTea} color="#10b981" />
            <Metric label="Coffee" value={stats.morningCoffee} color="#f59e0b" />
          </div>

          {/* Evening */}
          <div
            style={{
              padding: 14,
              background: "#f9fafb",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              🌙 Evening
            </div>

            <Metric label="Tea" value={stats.eveningTea} color="#10b981" />
            <Metric label="Coffee" value={stats.eveningCoffee} color="#f59e0b" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>☕ Admin Tea/Coffee Dashboard</h1>

      {/* TODAY BIG CARD */}
      <DayCard date={dates[0]} large />

      <h2 style={{ marginTop: 32, marginBottom: 16, fontSize: 22 }}>
        📆 Upcoming Days (Next 14 Days)
      </h2>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {dates.slice(1).map((date) => (
          <DayCard key={date} date={date} />
        ))}
      </div>
    </div>
  );
};


const TeaCoffee = ({ user }) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 TeaCoffee Component Loaded");
  console.log("📦 User object received:", user);
  console.log("🆔 user?.id:", user?.id);
  console.log("🆔 user?._id:", user?._id);
  console.log("👤 user?.role:", user?.role);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [orders, setOrders] = useState({});
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchedOnce = useRef(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedDates, setBulkSelectedDates] = useState([]);
  const [bulkSelection, setBulkSelection] = useState({ morning: null, evening: null });
  const [selectedDate, setSelectedDate] = useState(null);
  const [tempSelection, setTempSelection] = useState({ morning: null, evening: null });
  const isAdmin = ["Admin", "admin", "System Administrator", "Administrator", "system-admin"].includes(
  (user?.role || "").trim()
  );


  // Get the correct user ID
  const userId = user?._id || user?.id;

  const generateDates = useCallback(() => {
    const dateList = [];
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dateList.push(date.toISOString().split("T")[0]);
    }
    setDates(dateList);
  }, []);

  const fetchMyOrders = useCallback(async () => {
    if (!userId) {
      console.error("❌ No user ID available");
      alert("Error: User ID not found. Please refresh and try again.");
      return;
    }

    setLoading(true);
    try {
      console.log(`📡 Fetching orders for user ID: ${userId}`);
      const res = await axios.get(`${API_BASE}/my_orders/${userId}`);
      console.log("✅ Orders received:", res.data);
      
      const orderMap = {};
      res.data.forEach((order) => {
        orderMap[order.date] = order;
      });
      setOrders(orderMap);
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
      console.error("Error details:", err.response?.data);
      alert(err.response?.data?.error || "Failed to load orders. Please refresh the page.");
    }
    setLoading(false);
  }, [userId]);

  const fetchAdminOrders = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      const end = endDate.toISOString().split("T")[0];

      console.log(`📡 Admin fetching orders from ${today} to ${end}`);
      const res = await axios.get(`${API_BASE}/admin/orders?start_date=${today}&end_date=${end}`);
      console.log("✅ Admin orders received:", res.data);
      
      const orderMap = {};
      res.data.forEach((order) => {
        if (!orderMap[order.date]) {
          orderMap[order.date] = [];
        }
        orderMap[order.date].push(order);
      });
      setOrders(orderMap);
    } catch (err) {
      console.error("❌ Error fetching admin orders:", err);
      console.error("Error details:", err.response?.data);
      alert(err.response?.data?.error || "Failed to load orders. Please refresh the page.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (fetchedOnce.current) return;   // ⛔ prevents duplicate runs
    fetchedOnce.current = true;

    console.log("🔄 TeaCoffee component mounted ONCE. User:", user);
    console.log("User ID:", userId);

    generateDates();

    if (isAdmin) {
      fetchAdminOrders();
    } else if (userId) {
      fetchMyOrders();
    } else {
      console.error("❌ No user ID available");
      alert("Error: User information not available. Please log out and log in again.");
    }
  }, [isAdmin, userId, generateDates, fetchMyOrders, fetchAdminOrders]);


  const handleDateClick = (date) => {
    const day = new Date(date).getDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) return; // weekend disabled
    if (isPastCutoff(date)) return; // today's cutoff

    if (bulkMode) {
      // Toggle selection in bulk mode
      setBulkSelectedDates(prev =>
        prev.includes(date)
          ? prev.filter(d => d !== date)
          : [...prev, date]
      );
      return;
    }

    // single-day mode
    const existing = orders[date] || {};
    setSelectedDate(date);
    setTempSelection({
      morning: existing.morning || null,
      evening: existing.evening || null,
    });
  };


  const handleSlotToggle = (slot, value) => {
    setTempSelection(prev => ({
      ...prev,
      [slot]: prev[slot] === value ? null : value
    }));
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      alert("Please select a date first");
      return;
    }

    if (!userId) {
      alert("Error: User ID not found. Please refresh and try again.");
      return;
    }

    // Don't allow empty orders
    if (!tempSelection.morning && !tempSelection.evening) {
      alert("Please select at least one item (Tea or Coffee) for morning or evening");
      return;
    }

    try {
      const orderPayload = {
        employee_id: userId,
        date: selectedDate,
        morning: tempSelection.morning,
        evening: tempSelection.evening,
      };

      console.log("📤 Submitting order:", orderPayload);

      const response = await axios.post(`${API_BASE}/place_order`, orderPayload);

      console.log("✅ Order response:", response.data);

      // Update local state
      setOrders({
        ...orders,
        [selectedDate]: {
          date: selectedDate,
          morning: tempSelection.morning,
          evening: tempSelection.evening,
          employee_name: user.name,
          employee_email: user.email,
        },
      });
      
      alert(response.data.message || "Order submitted successfully!");
      setSelectedDate(null);
      setTempSelection({ morning: null, evening: null });
      
      // Refresh orders
      fetchMyOrders();
    } catch (err) {
      console.error("❌ Error submitting order:", err);
      console.error("Error response:", err.response?.data);
      alert(err.response?.data?.error || "Failed to submit order. Please try again.");
    }
  };

  const handleBulkSubmit = async () => {
  if (!bulkSelection.morning && !bulkSelection.evening) {
    alert("Select at least one item for morning/evening");
    return;
  }

  const validDates = bulkSelectedDates.filter(date => {
    const day = new Date(date).getDay();
    const isWeekend = day === 0 || day === 6;
    return !isWeekend && !isPastCutoff(date);
  });

  if (validDates.length === 0) {
    alert("No valid dates to submit (weekend or past cutoff)");
    return;
  }

  try {
    for (const date of validDates) {
      await axios.post(`${API_BASE}/place_order`, {
        employee_id: userId,
        date,
        morning: bulkSelection.morning,
        evening: bulkSelection.evening,
      });
    }

    alert(`Bulk order placed for ${validDates.length} days!`);
    setBulkMode(false);
    setBulkSelectedDates([]);
    setBulkSelection({ morning: null, evening: null });

    fetchMyOrders();

  } catch (err) {
    console.error("❌ Bulk order error:", err);
    alert("Error submitting bulk order");
  }
  };

  const handleDeleteOrder = async () => {
  if (!selectedDate) return;

  if (!window.confirm("Are you sure you want to cancel the entire order for this day?")) {
    return;
  }

  try {
    await axios.delete(`${API_BASE}/cancel_order`, {
      data: { employee_id: userId, date: selectedDate }
    });

    // Remove from UI immediately
    const updated = { ...orders };
    delete updated[selectedDate];
    setOrders(updated);

    alert("Order cancelled successfully!");

    setSelectedDate(null);
    setTempSelection({ morning: null, evening: null });

  } catch (err) {
    console.error("❌ Error cancelling order:", err);
    alert(err.response?.data?.error || "Failed to cancel order!");
   }
 };

  const handleCancel = () => {
    setSelectedDate(null);
    setTempSelection({ morning: null, evening: null });
  };

  const isPastCutoff = (date) => {
    const today = new Date().toISOString().split("T")[0];
    if (date !== today) return false;

    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(10, 30, 0, 0);
    return now >= cutoff;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      full: `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`
    };
  };

  const getOrderStatus = (date) => {
    const order = orders[date];
    if (!order) return "none";
    if (order.morning && order.evening) return "both";
    if (order.morning || order.evening) return "partial";
    return "none";
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  if (!userId && !isAdmin) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ 
          background: "#fef2f2", 
          border: "2px solid #fca5a5", 
          borderRadius: 8, 
          padding: 20,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ color: "#dc2626", marginBottom: 8 }}>User Not Found</h3>
          <p style={{ color: "#991b1b" }}>Please log out and log in again to use the tea/coffee ordering system.</p>
        </div>
      </div>
    );
  }

  // Employee/Manager View
  if (!isAdmin) {
    return (
      <div style={{ padding: 20 }}>
        <h2>☕ Tea/Coffee Orders</h2>
        <p style={{ color: "#6b7280", marginBottom: 20 }}>
          Click on a date to place your order. Orders must be placed before 10:30 AM for today.
        </p>

        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => {
              setBulkMode(!bulkMode);
              setBulkSelectedDates([]);
              setBulkSelection({ morning: null, evening: null });
              setSelectedDate(null);
            }}
            style={{
              padding: "10px 18px",
              background: bulkMode ? "#6b7280" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {bulkMode ? "Exit Bulk Mode" : "Enable Bulk Ordering"}
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 12,
          marginBottom: 30
        }}>
          {dates.map((date) => {
            const dateInfo = formatDate(date);
            const status = getOrderStatus(date);
            const day = new Date(date).getDay(); // 0 = Sun, 6 = Sat
            const isWeekend = day === 0 || day === 6;
            const disabled = isPastCutoff(date) || isWeekend;
            const isToday = date === new Date().toISOString().split("T")[0];
            const isBulkSelected = bulkMode && bulkSelectedDates.includes(date);

            return (
              <div
                key={date}
                onClick={() => !disabled && handleDateClick(date)}
                style={{
                  padding: 12,
                  border: isBulkSelected
                    ? "3px solid #10b981"          // 🌿 Green border for bulk selected
                    : selectedDate === date
                    ? "3px solid #3b82f6"
                    : "2px solid #e5e7eb",
                  borderRadius: 8,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                  background: isWeekend
                    ? "#f3f4f6"
                    : isBulkSelected
                    ? "#d1fae5"                   // 🌿 Greenish background
                    : status === "both"
                    ? "#d1fae5"
                    : status === "partial"
                    ? "#fef3c7"
                    : isToday
                    ? "#dbeafe"
                    : "white",
                  transition: "all 0.2s",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                  {dateInfo.day}
                </div>
                <div style={{ fontSize: 24, fontWeight: "bold", margin: "4px 0" }}>
                  {dateInfo.date}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {dateInfo.month}
                </div>
                {status !== "none" && (
                  <div style={{ fontSize: 10, marginTop: 4, color: "#059669" }}>
                    ✓ Ordered
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* BULK SELECTION PANEL */}
        {bulkMode && bulkSelectedDates.length > 0 && (
          <div style={{
            border: "2px solid #10b981",
            borderRadius: 8,
            padding: 20,
            background: "#ecfdf5",
            marginBottom: 20
          }}>
            <h3>Bulk Order for {bulkSelectedDates.length} days</h3>

            <div style={{ marginTop: 20 }}>
              <h4>Morning Slot</h4>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setBulkSelection(prev => ({ ...prev, morning: "tea" }))}
                  style={{
                    padding: "10px 20px",
                    border: "2px solid",
                    borderColor: bulkSelection.morning === "tea" ? "#10b981" : "#d1d5db",
                    borderRadius: 6,
                    background: bulkSelection.morning === "tea" ? "#10b981" : "white",
                    color: bulkSelection.morning === "tea" ? "white" : "#374151",
                    cursor: "pointer"
                  }}
                >
                  ☕ Tea
                </button>
                <button
                  onClick={() => setBulkSelection(prev => ({ ...prev, morning: "coffee" }))}
                  style={{
                    padding: "10px 20px",
                    border: "2px solid",
                    borderColor: bulkSelection.morning === "coffee" ? "#10b981" : "#d1d5db",
                    borderRadius: 6,
                    background: bulkSelection.morning === "coffee" ? "#10b981" : "white",
                    color: bulkSelection.morning === "coffee" ? "white" : "#374151",
                    cursor: "pointer"
                  }}
                >
                  ☕ Coffee
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <h4>Evening Slot</h4>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setBulkSelection(prev => ({ ...prev, evening: "tea" }))}
                  style={{
                    padding: "10px 20px",
                    border: "2px solid",
                    borderColor: bulkSelection.evening === "tea" ? "#10b981" : "#d1d5db",
                    borderRadius: 6,
                    background: bulkSelection.evening === "tea" ? "#10b981" : "white",
                    color: bulkSelection.evening === "tea" ? "white" : "#374151",
                    cursor: "pointer"
                  }}
                >
                  ☕ Tea
                </button>
                <button
                  onClick={() => setBulkSelection(prev => ({ ...prev, evening: "coffee" }))}
                  style={{
                    padding: "10px 20px",
                    border: "2px solid",
                    borderColor: bulkSelection.evening === "coffee" ? "#10b981" : "#d1d5db",
                    borderRadius: 6,
                    background: bulkSelection.evening === "coffee" ? "#10b981" : "white",
                    color: bulkSelection.evening === "coffee" ? "white" : "#374151",
                    cursor: "pointer"
                  }}
                >
                  ☕ Coffee
                </button>
              </div>
            </div>

            <button
              onClick={handleBulkSubmit}
              style={{
                marginTop: 20,
                padding: "12px 24px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Submit Bulk Order
            </button>
          </div>
        )}

        {/* Selection Panel */}
        {selectedDate && (
          <div style={{
            border: "2px solid #3b82f6",
            borderRadius: 8,
            padding: 20,
            background: "#f0f9ff"
          }}>
            <h3>Order for {formatDate(selectedDate).full}</h3>
            
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 10 }}>Morning Slot:</h4>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => handleSlotToggle("morning", "tea")}
                  style={{
                    padding: "10px 20px",
                    border: "2px solid",
                    borderColor: tempSelection.morning === "tea" ? "#10b981" : "#d1d5db",
                    borderRadius: 6,
                    background: tempSelection.morning === "tea" ? "#10b981" : "white",
                    color: tempSelection.morning === "tea" ? "white" : "#374151",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  ☕ Tea
                </button>
                <button
                  onClick={() => handleSlotToggle("morning", "coffee")}
                  style={{
                    padding: "10px 20px",
                    border: "2px solid",
                    borderColor: tempSelection.morning === "coffee" ? "#10b981" : "#d1d5db",
                    borderRadius: 6,
                    background: tempSelection.morning === "coffee" ? "#10b981" : "white",
                    color: tempSelection.morning === "coffee" ? "white" : "#374151",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  ☕ Coffee
                </button>
                {tempSelection.morning && (
                  <button
                    onClick={() => setTempSelection(prev => ({ ...prev, morning: null }))}
                    style={{
                      padding: "10px 20px",
                      border: "2px solid #ef4444",
                      borderRadius: 6,
                      background: "white",
                      color: "#ef4444",
                      cursor: "pointer"
                    }}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 10 }}>Evening Slot:</h4>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => handleSlotToggle("evening", "tea")}
                  style={{
                    padding: "10px 20px",
                    border: "2px solid",
                    borderColor: tempSelection.evening === "tea" ? "#10b981" : "#d1d5db",
                    borderRadius: 6,
                    background: tempSelection.evening === "tea" ? "#10b981" : "white",
                    color: tempSelection.evening === "tea" ? "white" : "#374151",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  ☕ Tea
                </button>
                <button
                  onClick={() => handleSlotToggle("evening", "coffee")}
                  style={{
                    padding: "10px 20px",
                    border: "2px solid",
                    borderColor: tempSelection.evening === "coffee" ? "#10b981" : "#d1d5db",
                    borderRadius: 6,
                    background: tempSelection.evening === "coffee" ? "#10b981" : "white",
                    color: tempSelection.evening === "coffee" ? "white" : "#374151",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  ☕ Coffee
                </button>
                {tempSelection.evening && (
                  <button
                    onClick={() => setTempSelection(prev => ({ ...prev, evening: null }))}
                    style={{
                      padding: "10px 20px",
                      border: "2px solid #ef4444",
                      borderRadius: 6,
                      background: "white",
                      color: "#ef4444",
                      cursor: "pointer"
                    }}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button
                onClick={handleSubmit}
                disabled={!tempSelection.morning && !tempSelection.evening}
                style={{
                padding: "12px 24px",
                background: (!tempSelection.morning && !tempSelection.evening) ? "#9ca3af" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: (!tempSelection.morning && !tempSelection.evening) ? "not-allowed" : "pointer",
                fontWeight: 600
                }}
            >
                Submit Order
            </button>

            {/* RESET / CLOSE PANEL */}
            <button
                onClick={handleCancel}
                style={{
                padding: "12px 24px",
                background: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer"
                }}
            >
                Close
            </button>

            {/* DELETE ENTIRE ORDER */}
            {orders[selectedDate] && (
                <button
                onClick={handleDeleteOrder}
                style={{
                    padding: "12px 24px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                    marginLeft: "auto"
                }}
                >
                Delete Order
                </button>
            )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin View (rest of the admin view code remains the same)
  return <AdminView dates={dates} orders={orders} formatDate={formatDate} />;
};

export default TeaCoffee;