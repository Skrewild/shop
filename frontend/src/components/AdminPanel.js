import React, { useEffect, useState } from "react";
import adminApi from "../api/adminApi";
import "../styles.css";

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ name: "", price: "", location: "" });
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { loadProducts(); loadOrders(); }, []);

  const loadProducts = async () => {
    try { const res = await adminApi.getProducts(); setProducts(res.data); }
    catch { setMsg("Failed to load products."); }
  };

  const loadOrders = async () => {
    try { const res = await adminApi.getOrders(); setOrders(res.data); }
    catch { setMsg("Failed to load orders."); }
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAddOrEdit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editId) {
        await adminApi.updateProduct(editId, form);
        setMsg("Product updated.");
      } else {
        await adminApi.addProduct(form);
        setMsg("Product added.");
      }
      setForm({ name: "", price: "", location: "" });
      setEditId(null);
      loadProducts();
    } catch (err) {
      setMsg(err.response?.data?.error || "Error occurred.");
    }
  };

  const handleEditInit = (p) => setForm({ name: p.name, price: p.price, location: p.location }) || setEditId(p.id);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await adminApi.deleteProduct(id);
    loadProducts();
  };

  const handleOrderDelete = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    await adminApi.deleteOrder(id);
    loadOrders();
  };

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>

      {/* Product Form */}
      <form onSubmit={handleAddOrEdit} style={{ marginBottom: 24 }}>
        <h3>{editId ? "Edit Product" : "Add Product"}</h3>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
        <input name="price" value={form.price} onChange={handleChange} placeholder="Price" required type="number" min="1" />
        <input name="location" value={form.location} onChange={handleChange} placeholder="Image (products/xxx.jpg)" required />
        <button type="submit">{editId ? "Update" : "Add"}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: "", price: "", location: "" }); }}>Cancel</button>}
      </form>

      <div style={{ color: "#d00" }}>{msg}</div>

      {/* Product List */}
      <h3>Products</h3>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Location</th><th>Actions</th></tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>${p.price}</td>
              <td>{p.location}</td>
              <td>
                <button onClick={() => handleEditInit(p)}>Edit</button>
                <button onClick={() => handleDelete(p.id)} style={{ color: "#c00" }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
            
      <h3>Orders</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th><th>User</th><th>Email</th><th>Contact</th><th>City</th><th>Address</th>
            <th>Product</th><th>Price</th><th>Time</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.name}</td>
              <td>{o.email}</td>
              <td>{o.contact}</td>
              <td>{o.city}</td>
              <td>{o.address}</td>
              <td>{o.product_name || o.item_name}</td>
              <td>${o.price}</td>
              <td>{o.created_at?.slice(0, 19).replace("T", " ")}</td>
              <td>
                <button onClick={() => handleOrderDelete(o.id)} style={{ color: "#c00" }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
