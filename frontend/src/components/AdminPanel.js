import React, { useState, useEffect } from "react";
import { adminApi } from "../api/api";

// --- Subcomponent for add/edit product ---
function ProductForm({ onSubmit, initial, onCancel }) {
  const [form, setForm] = useState(
    initial || { name: "", price: "", location: "" }
  );
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(form);
      }}
      style={{ marginBottom: 16 }}
    >
      <input
        required
        placeholder="Name"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
      />
      <input
        required
        placeholder="Price"
        type="number"
        value={form.price}
        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
        min={0}
        step={0.01}
      />
      <input
        required
        placeholder="Image path (e.g. products/photo.jpg)"
        value={form.location}
        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
      />
      <button type="submit">{initial ? "Update" : "Add"}</button>
      {onCancel && (
        <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>
          Cancel
        </button>
      )}
    </form>
  );
}

export default function AdminPanel() {
  // --- Login ---
  const [secret, setSecret] = useState(localStorage.getItem("adminSecret") || "");
  const [isAuth, setIsAuth] = useState(!!secret);
  const [error, setError] = useState("");

  // --- Data ---
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Forms ---
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // --- Login logic ---
  const handleLogin = async e => {
    e.preventDefault();
    setError("");
    try {
      // Try to get products to test secret
      await adminApi(secret).get("/products");
      localStorage.setItem("adminSecret", secret);
      setIsAuth(true);
    } catch {
      setError("Invalid secret!");
    }
  };

  // --- Fetch products & orders ---
  const fetchAll = async () => {
    if (!isAuth) return;
    setLoading(true);
    try {
      const [prodRes, ordRes] = await Promise.all([
        adminApi(secret).get("/products"),
        adminApi(secret).get("/admin/orders"),
      ]);
      setProducts(prodRes.data || []);
      setOrders(ordRes.data || []);
      setLoading(false);
    } catch (e) {
      setError("Failed to load data");
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [isAuth]);

  // --- Actions ---
  const handleAdd = async data => {
    try {
      await adminApi(secret).post("/products/add", data);
      setShowAdd(false);
      fetchAll();
    } catch (e) {
      alert("Failed to add product");
    }
  };

  const handleEdit = async data => {
    try {
      await adminApi(secret).put(`/products/${editProduct.id}`, data);
      setEditProduct(null);
      fetchAll();
    } catch {
      alert("Failed to update product");
    }
  };

  const handleDelete = async id => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await adminApi(secret).delete(`/products/${id}`);
      fetchAll();
    } catch {
      alert("Failed to delete product");
    }
  };

  const handleDeleteOrder = async id => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await adminApi(secret).delete(`/admin/orders/${id}`);
      fetchAll();
    } catch {
      alert("Failed to delete order");
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem("adminSecret");
    setIsAuth(false);
    setSecret("");
  };

  // --- UI ---
  if (!isAuth) {
    return (
      <div style={{ maxWidth: 400, margin: "40px auto" }}>
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={secret}
            placeholder="Admin Secret"
            onChange={e => setSecret(e.target.value)}
            required
            style={{ marginBottom: 8, width: "100%" }}
          />
          <button type="submit" style={{ width: "100%" }}>
            Login
          </button>
          {error && <div style={{ color: "tomato", marginTop: 8 }}>{error}</div>}
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto" }}>
      <h2>Admin Panel</h2>
      <button onClick={handleLogout} style={{ float: "right", marginTop: -30 }}>
        Logout
      </button>

      <h3>Products</h3>
      {showAdd ? (
        <ProductForm
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <button onClick={() => setShowAdd(true)}>Add Product</button>
      )}

      {editProduct && (
        <ProductForm
          initial={editProduct}
          onSubmit={handleEdit}
          onCancel={() => setEditProduct(null)}
        />
      )}

      <table border="1" cellPadding={6} style={{ marginTop: 12, width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Price</th><th>Image</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>${p.price}</td>
              <td>{p.location}</td>
              <td>
                <button onClick={() => setEditProduct(p)}>Edit</button>
                <button onClick={() => handleDelete(p.id)} style={{ marginLeft: 8 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 30 }}>Confirmed Orders</h3>
      <table border="1" cellPadding={6} style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th><th>Product</th><th>Price</th>
            <th>User</th><th>Contact</th><th>City</th><th>Address</th>
            <th>Ordered At</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.item_name}</td>
              <td>${o.price}</td>
              <td>{o.name} <br />({o.email})</td>
              <td>{o.contact}</td>
              <td>{o.city}</td>
              <td>{o.address}</td>
              <td>{o.created_at?.slice(0, 19).replace("T", " ")}</td>
              <td>
                <button onClick={() => handleDeleteOrder(o.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <div style={{ marginTop: 20 }}>Loading...</div>}
    </div>
  );
}
