import React, { useEffect, useState } from "react";
import api from "../api/api";
import "../styles.css";

export default function Cart({ email }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState("");

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    api
      .get("/cart", { params: { email } })
      .then((res) => {
        setCart(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [email]);

const confirmOrderItem = async (id) => {
  try {
    await api.post("/orders/confirm", { item_id: id });
    setCart((cart) => cart.filter((item) => item.id !== id));
    setPopup("Order confirmed!");
    setTimeout(() => setPopup(""), 1500);
  } catch {
    setPopup("Failed to confirm order.");
    setTimeout(() => setPopup(""), 1500);
  }
};


  const removeCartItem = async (id) => {
    try {
      await api.delete(`/cart/${id}`);
      setCart((cart) => cart.filter((item) => item.id !== id));
      setPopup("Item removed from cart.");
      setTimeout(() => setPopup(""), 1500);
    } catch {
      setPopup("Failed to remove item.");
      setTimeout(() => setPopup(""), 1500);
    }
  };

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!cart.length) return <div className="empty-state">Your cart is empty.</div>;

  return (
    <div className="cart-container">
      {popup && (
        <div className="popup">
          <div className="popup-content">{popup}</div>
        </div>
      )}

      <div className="cart-list">
        {cart.map((item) => (
          <div className="cart-item" key={item.id}>
            <div className="cart-item-details">
              <h3>{item.name}</h3>
              <div className="price">${item.price}</div>
            </div>
            <div className="cart-item-actions">
              <button className="cart-btn" onClick={() => confirmOrderItem(item.id)}>
                Confirm Order
              </button>
              <button
                className="cart-btn"
                style={{ background: "#f44336", marginLeft: 8 }}
                onClick={() => removeCartItem(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
