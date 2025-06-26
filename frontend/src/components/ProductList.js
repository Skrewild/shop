import React, { useEffect, useState } from "react";
import api from "../api/api";
import "../styles.css";

export default function ProductList({ email }) {
  const [products, setProducts] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch(() => setMsg("Failed to load products. Try again later."));
  }, []);

  const addToCart = async (id) => {
    if (!email) {
      alert("Please login to add products to your cart.");
      return;
    }
    try {
      // ПРОСТО email и item_id
      await api.post("/cart", { item_id: id, email });
      setMsg("Added to cart!");
      setTimeout(() => setMsg(""), 1500);
    } catch (err) {
      setMsg(
        err.response?.data?.error === "User not found"
          ? "User not found! Please log in again."
          : (err.response?.data?.error || "Add to cart failed.")
      );
    }
  };

  if (!products.length)
    return <div className="empty-state">{msg || "No products available."}</div>;

  return (
    <div>
      {msg && <div className="empty-state">{msg}</div>}
      <div className="products-grid">
        {products.map((product) => (
          <div className="product-card" key={product.id}>
            <img
              src={
                product.location
                  ? `/products/${product.location.replace(/^products\//, "").replace(/^\/+/, "")}`
                  : "/default-product.jpg"
              }
              alt={product.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/default-product.jpg";
              }}
            />
            <h3>{product.name}</h3>
            <div className="price">${product.price}</div>
            <button
              className="add-to-cart"
              onClick={() => addToCart(product.id)}
              disabled={!email}
              style={
                !email ? { background: "#888", cursor: "not-allowed" } : {}
              }
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
      {!email && (
        <div className="empty-state">Log in to add items to cart.</div>
      )}
    </div>
  );
}
