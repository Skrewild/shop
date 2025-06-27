import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Layout from "./components/Layout";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";
import Orders from "./components/Orders";
import AdminPanel from "./components/AdminPanel";

function App() {
  const [name, setName] = useState(localStorage.getItem("name"));
  const [email, setEmail] = useState(localStorage.getItem("email") || "");

  const onLogout = () => {
    localStorage.clear();
    window.location.href = '/';
    setName(null);
    setEmail("");
  };

  const ADMIN_EMAIL = "admin@com";

  return (
    <Router>
      <Layout isLoggedIn={!!email} name={name} email={email} onLogout={onLogout}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setName={setName} setEmail={setEmail} />} />
          <Route path="/register" element={<Register setName={setName} setEmail={setEmail} />} />
          <Route path="/products" element={<ProductList email={email} />} />
          <Route
            path="/cart"
            element={email ? <Cart email={email} /> : <Navigate to="/login" />}
          />
          <Route path="/orders" element={<Orders email={email} />} />
          <Route
            path="/admin"
            element={email === ADMIN_EMAIL ? <AdminPanel email={email} /> : <Navigate to="/" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
