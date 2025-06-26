import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import api from '../api/api';
import '../styles.css';

export default function Login({ setName, setEmail }) {
  const [email, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      setName(res.data.name);
      setEmail(res.data.email);
      localStorage.setItem('name', res.data.name);
      localStorage.setItem('email', res.data.email);
      navigate("/products"); // Redirect to the catalog after login
    } catch (err) {
      console.log("API error:", err, err.response);
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || err.message || "Login failed!");
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="email">Email</label>
        <input
          className="auth-input"
          id="email"
          type="email"
          value={email}
          autoComplete="username"
          onChange={e => setEmailInput(e.target.value)}
          placeholder="Email"
          required
        />
        <label className="auth-label" htmlFor="password">Password</label>
        <input
          className="auth-input"
          id="password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        {error && <div style={{ color: "tomato", marginBottom: 10 }}>{error}</div>}
        <button className="auth-btn" type="submit">Login</button>
      </form>
    </div>
  );
}
