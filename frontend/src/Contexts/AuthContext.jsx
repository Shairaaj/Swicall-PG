// src/Contexts/AuthContext.jsx
import React, { createContext, useEffect, useState } from "react";
import axios from "axios";
import { getOrCreateDeviceId } from "../utils/deviceId";

export const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isPrimaryDevice, setIsPrimaryDevice] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [password, setPassword] = useState("");

  // 1) Setup deviceId once
  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    if (id) {
      axios.defaults.headers.common["X-Device-Id"] = id;
    }
  }, []);

  // 2) Read token from URL (?token=) or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken) {
      params.delete("token");
      const newQuery = params.toString();
      const newUrl =
        window.location.pathname + (newQuery ? `?${newQuery}` : "");
      window.history.replaceState({}, "", newUrl);

      localStorage.setItem("token", urlToken);
      setToken(urlToken);
    } else {
      const saved = localStorage.getItem("token");
      if (saved) setToken(saved);
    }
  }, []);

  // 3) When token changes, set Authorization header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // 4) After we have token + deviceId, fetch profile (/api/auth/me)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token || !deviceId) return;
      try {
        const res = await axios.get(`${API_BASE}/api/auth/me`,{
      headers: {
        Authorization: `Bearer ${token}`,
      }
      });
        if (res.data?.user) {
          setUsername(res.data.user.username || "");
          setEmail(res.data.user.email || "");
          setIsPrimaryDevice(!!res.data.user.isPrimaryDevice);
        }
      } catch (err) {
        console.error("Fetch /me failed:", err);
        // if token invalid, log out
        if (err.response?.status === 401) {
          logout();
        }
      }
    };
    fetchProfile();
  }, [token, deviceId]);

  const handleAuthSuccess = (data) => {
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
    if (data.user) {
      setUsername(data.user.username || "");
      setEmail(data.user.email || "");
      setIsPrimaryDevice(!!data.user.isPrimaryDevice);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUsername("");
    setEmail("");
    setIsPrimaryDevice(false);
  };

  const value = {
    token,
    setToken,
    username,
    setUsername,
    email,
    setEmail,
    isPrimaryDevice,
    setIsPrimaryDevice,
    password,
    setPassword,
    deviceId,
    logout,
    handleAuthSuccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
