import React, { useEffect, useState } from "react";
import api from "../api/api";
import "../styles.css";

export default function Orders({ email }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    api
      .get("/orders", { params: { email } })
      .then((res) => {
        setOrders(res.data);
        setLoading(false);
      })
      .catch(() => {
        setMsg("Failed to load orders.");
        setLoading(false);
      });
  }, [email]);

  const cancelOrder = async (orderId) => {
    try {
      await api.post("/orders/cancel", { id: orderId, email });
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setMsg("Order cancelled!");
      setTimeout(() => setMsg(""), 2000);
    } catch {
      setMsg("Failed to cancel order.");
      setTimeout(() => setMsg(""), 2000);
    }
  };

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!orders.length) return <div className="empty-state">{msg || "You have no orders yet."}</div>;

  return (
    <div className="order-history-container">
      <h2>Your Order History</h2>
      {msg && <div className="cart-msg">{msg}</div>}
      {orders.map((order) => (
        <div className="order-item" key={order.id}>
          <div className="cart-item-details">
            <h3>{order.name}</h3>
            <div className="price">${order.price}</div>
            <div style={{ color: "#888" }}>
              Ordered at: {order.created_at?.slice(0, 19).replace("T", " ")}
            </div>
          </div>
          <div className="cart-item-actions">
            <button
              className="cart-btn"
              style={{ background: "#dc3545", color: "#fff" }}
              onClick={() => cancelOrder(order.id)}
            >
              Cancel Order
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
