import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import api from '../api/api';
import '../styles.css';

export default function Register({ setName, setEmail }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', contact: '', city: '', address: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
  e.preventDefault();
  setError('');
  try {
    const res = await api.post('/auth/register', form);
    setName(res.data.name);
    setEmail(res.data.email);
    localStorage.setItem('name', res.data.name);
    localStorage.setItem('email', res.data.email);
    navigate("/products");
  } catch (err) {
    console.log("API error:", err, err.response);

    let msg = "Registration failed!";
    if (err.response && typeof err.response.data?.error === "string") {
      msg = err.response.data.error;
    } else if (err.response && typeof err.response.data === "string") {
      msg = err.response.data;
    } else if (err.response && err.response.data) {
      msg = JSON.stringify(err.response.data);
    } else if (err.message) {
      msg = err.message;
    }
    setError(msg);
  }
};


  return (
    <div className="auth-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="name">Name</label>
        <input className="auth-input" name="name" id="name" onChange={handleChange} placeholder="Name" required />

        <label className="auth-label" htmlFor="email">Email</label>
        <input className="auth-input" name="email" id="email" type="email" onChange={handleChange} placeholder="Email" required />

        <label className="auth-label" htmlFor="password">Password</label>
        <input className="auth-input" name="password" id="password" type="password" onChange={handleChange} placeholder="Password" required />

        <label className="auth-label" htmlFor="contact">Contact</label>
        <input className="auth-input" name="contact" id="contact" onChange={handleChange} placeholder="Contact" required />

        <label className="auth-label" htmlFor="city">City</label>
        <input className="auth-input" name="city" id="city" onChange={handleChange} placeholder="City" required />

        <label className="auth-label" htmlFor="address">Address</label>
        <textarea className="auth-input" name="address" id="address" onChange={handleChange} placeholder="Address" required />

        {error && <div style={{ color: "tomato", marginBottom: 10 }}>{error}</div>}
        <button className="auth-btn" type="submit">Register</button>
      </form>
    </div>
  );
}
