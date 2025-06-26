// src/components/Cart.js
import React, { useEffect, useState } from "react";
import api from "../api/api";
import "../styles.css";

export default function Cart({ email }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(""); // For the popup message

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    api.get("/cart", { params: { email } })
      .then(res => { setCart(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [email]);

  const confirmOrderItem = async (id) => {
    try {
      await api.post("/cart/confirm", { item_id: id });
      setCart(cart => cart.filter(item => item.id !== id));
      setPopup("Order confirmed!");
      setTimeout(() => setPopup(""), 1500);
    } catch {
      setPopup("Failed to confirm order.");
      setTimeout(() => setPopup(""), 1500);
    }
  };

  // Optional: place all orders at once
  const confirmAllOrder = async () => {
    try {
      await api.post("/order/confirm", { email });
      setCart([]);
      setPopup("All items ordered! Thank you!");
      setTimeout(() => setPopup(""), 2000);
    } catch {
      setPopup("Failed to place order.");
      setTimeout(() => setPopup(""), 2000);
    }
  };

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!cart.length) return <div className="empty-state">Your cart is empty.</div>;

  return (
    <div className="cart-container">
      {/* Popup */}
      {popup && (
        <div className="popup">
          <div className="popup-content">
            {popup}
          </div>
        </div>
      )}

      <div className="cart-list">
        {cart.map(item => (
          <div className="cart-item" key={item.id}>
            <img className="cart-item-img"
                 src={item.location ? `/products/${item.location.replace(/^products\//, "")}` : "/default-product.jpg"}
                 alt={item.name}
                 onError={e => e.target.src = "/default-product.jpg"}
            />
            <div className="cart-item-details">
              <h3>{item.name}</h3>
              <div className="price">${item.price}</div>
            </div>
            <div className="cart-item-actions">
              <button className="cart-btn" onClick={() => confirmOrderItem(item.id)}>
                Confirm Order
              </button>
              {/* Remove button here if you want */}
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button className="cart-btn" style={{ background: "#4caf50", fontSize: 18 }} onClick={confirmAllOrder}>
          Place Order for All
        </button>
      </div>
    </div>
  );
}
