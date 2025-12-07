// routes/authRoutes.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyJWT } from "../middleware/authMiddleware.js";

const router = express.Router();

const buildAuthResponse = (user, deviceId) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const isPrimaryDevice =
    !!deviceId && !!user.primaryDeviceId && deviceId === user.primaryDeviceId;

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      isPrimaryDevice,
    },
  };
};

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, deviceId: bodyDeviceId } = req.body;
    const headerDeviceId = req.headers["x-device-id"];
    const deviceId = bodyDeviceId || headerDeviceId;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    if (!deviceId) {
      return res
        .status(400)
        .json({ error: "Device ID required for signup (X-Device-Id header)" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      passwordHash: hash,
      primaryDeviceId: deviceId,
    });

    const response = buildAuthResponse(user, deviceId);
    return res.json(response);
  } catch (err) {
    console.error("Signup error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, deviceId: bodyDeviceId } = req.body;
    const headerDeviceId = req.headers["x-device-id"];
    const deviceId = bodyDeviceId || headerDeviceId || null;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (!user.primaryDeviceId && deviceId) {
      user.primaryDeviceId = deviceId;
      await user.save();
    }

    const response = buildAuthResponse(user, deviceId);
    return res.json(response);
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});
// Get current user profile (after login / token restore)
router.get("/me", verifyJWT, (req, res) => {
  const headerDeviceId =
    req.headers["x-device-id"] || req.headers["X-Device-Id"] || null;

  const isPrimaryDevice =
    !!headerDeviceId &&
    !!req.user.primaryDeviceId &&
    headerDeviceId === req.user.primaryDeviceId;

  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      username: req.user.username,
      isPrimaryDevice,
    },
  });
});

export default router;
