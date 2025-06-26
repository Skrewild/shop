// src/components/Orders.js
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
    api.get("/orders", { params: { email } })
      .then(res => { setOrders(res.data); setLoading(false); })
      .catch(() => { setMsg("Failed to load orders."); setLoading(false); });
  }, [email]);

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!orders.length) return <div className="empty-state">{msg || "You have no orders yet."}</div>;

  return (
    <div className="order-history-container">
      <h2>Your Order History</h2>
      {orders.map(order => (
        <div className="order-item" key={order.id}>
          <img
            className="cart-item-img"
            src={order.location ? `/products/${order.location.replace(/^products\//, "")}` : "/default-product.jpg"}
            alt={order.name}
          />
          <div className="cart-item-details">
            <h3>{order.name}</h3>
            <div className="price">${order.price}</div>
            <div style={{ color: "#888" }}>
              Ordered at: {order.created_at?.slice(0, 19).replace("T", " ")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
