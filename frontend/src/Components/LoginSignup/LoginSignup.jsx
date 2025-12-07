// src/Components/LoginSignup/LoginSignup.jsx
import React, { useContext, useState } from "react";
import "./LoginSignup.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleUser,
  faEnvelope,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../../Contexts/AuthContext";
import axios from "axios";

const LoginSignup = ({ onBackToLanding }) => {
  const [action, setAction] = useState("Login"); // "Login" or "Signup"
  const [error, setError] = useState("");

  const {
    username,
    setUsername,
    password,
    setPassword,
    email,
    setEmail,
    deviceId,
    handleAuthSuccess,
  } = useContext(AuthContext);

  const api = import.meta.env.VITE_API_URL;

  const validateEmailPass = () => {
    if (!email || !password) {
      setError("Email and password are required");
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    setError("");
    if (!validateEmailPass()) return;

    try {
      const res = await axios.post(`${api}/api/auth/signup`, {
        username,
        email,
        password,
        deviceId,
      });
      handleAuthSuccess(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Signup failed");
    }
  };

  const handleLogin = async () => {
    setError("");
    if (!validateEmailPass()) return;

    try {
      const res = await axios.post(`${api}/api/auth/login`, {
        email,
        password,
        deviceId,
      });
      handleAuthSuccess(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Login failed");
    }
  };

  const handleGoogle = () => {
    if (!deviceId) {
      alert("Device ID not ready. Please try again in a moment.");
      return;
    }
    window.location.href = `${api}/auth/google?deviceId=${encodeURIComponent(
      deviceId
    )}`;
  };

  const onSubmit = () => {
    if (action === "Login") {
      handleLogin();
    } else {
      handleSignup();
    }
  };

  return (
    <div className="ls-root">
      <div className="ls-card">
        <div className="ls-header">
          <div className="ls-title">{action}</div>
          <div className="ls-underline"></div>
        </div>

        {/* Tabs: just switch mode, not actual login buttons */}
        <div className="ls-toggle">
          <button
            className={action === "Login" ? "ls-btn active" : "ls-btn"}
            onClick={() => {
              setAction("Login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            className={action === "Signup" ? "ls-btn active" : "ls-btn"}
            onClick={() => {
              setAction("Signup");
              setError("");
            }}
          >
            Signup
          </button>
        </div>

        <div className="ls-inputs">
          {action === "Signup" && (
            <div className="ls-input">
              <FontAwesomeIcon icon={faCircleUser} className="ls-icon" />
              <input
                type="text"
                placeholder="Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div className="ls-input">
            <FontAwesomeIcon icon={faEnvelope} className="ls-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="ls-input">
            <FontAwesomeIcon icon={faLock} className="ls-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="ls-error">{error}</div>}

        <div className="ls-actions">
          {/* Only ONE main button */}
          <button className="btn-primary full" onClick={onSubmit}>
            {action === "Login" ? "Login" : "Create Account"}
          </button>

          {/* Secondary action */}
          <button className="btn-secondary full" onClick={handleGoogle}>
            Continue with Google
          </button>
        </div>

        <button className="ls-back" onClick={onBackToLanding}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default LoginSignup;
