import React from "react";
import "../styles.css";
import { Link } from "react-router-dom";

export default function Layout({ children, isLoggedIn, name, email, onLogout }) {
  return (
    <div style={{
        backgroundImage: "url('/background.jpg')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        minHeight: "100vh",
        minWidth: "100vw"
      }}>
      <div className="overlay"></div>
      <header>
        <div className="logo">
          <Link to="/"><img src="build/logo.png" alt="logo" /></Link>
        </div>
        <nav>
          <ul>
            <li>
              <Link to="/products">Catalog</Link>
            </li>
            {/* Show Cart if logged in */}
            {isLoggedIn && (
              <li>
                <Link to="/cart">Cart</Link>
              </li>
            )}
            {/* Show Admin Panel link only for admin */}
            {email === "admin@site.com" && (
              <li>
                <Link to="/admin">Admin Panel</Link>
              </li>
            )}
            {/* Login/Register vs Orders/Logout */}
            {!isLoggedIn ? (
              <>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/orders">Orders</Link></li>
                <li>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ffd600",
                      cursor: "pointer",
                      fontSize: "1rem"
                    }}
                    onClick={onLogout}
                  >Logout</button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </header>
      <main style={{ minHeight: "80vh" }}>
        {children}
      </main>
    </div>
  );
}
