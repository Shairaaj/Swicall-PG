// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import { google } from "googleapis";
import axios from "axios";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import User from "./models/User.js";
import Contact from "./models/Contact.js";

dotenv.config();

const app = express();
connectDB();

app.use(express.json());

// ---------- CORS ----------
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-Id"],
  })
);

// ---------- Session (only for Google OAuth state: deviceId etc.) ----------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "swicall-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 5 * 60 * 1000, // 5 minutes
    },
  })
);

// ---------- API Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);

// ---------- Google OAuth setup ----------
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

const encrypt = (text) =>
  CryptoJS.AES.encrypt(text, process.env.AES_SECRET).toString();

/**
 * Step 1: Redirect user to Google consent screen.
 * Frontend should call: GET /auth/google?deviceId=<GUID>
 */
app.get("/auth/google", (req, res) => {
  const { deviceId } = req.query;
  if (deviceId) {
    req.session.deviceId = deviceId;
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  res.redirect(url);
});

/**
 * Step 2: Callback from Google
 */
app.get("/auth/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("No code provided");

    const { tokens } = await oauth2Client.getToken(code);
    const access_token = tokens.access_token;

    // Get user info
    const profileRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    const profile = profileRes.data;

    const deviceId = req.session.deviceId || null;

    let user = await User.findOne({ email: profile.email });

    if (!user) {
      user = await User.create({
        username: profile.name,
        email: profile.email,
        googleId: profile.id,
        primaryDeviceId: deviceId || undefined,
      });
    } else {
      if (!user.googleId) {
        user.googleId = profile.id;
      }
      if (!user.primaryDeviceId && deviceId) {
        user.primaryDeviceId = deviceId;
      }
      await user.save();
    }

    const isPrimaryDevice =
      !!deviceId && !!user.primaryDeviceId && deviceId === user.primaryDeviceId;

    // Sync contacts only from primary device
    if (isPrimaryDevice) {
      oauth2Client.setCredentials(tokens);
      const people = google.people({ version: "v1", auth: oauth2Client });

      const peopleRes = await people.people.connections.list({
        resourceName: "people/me",
        pageSize: 200,
        personFields: "names,phoneNumbers",
      });

      const connections = peopleRes.data.connections || [];

      const seen = new Set();
      const contactDocs = [];

      for (const c of connections) {
        const names =
          c.names && c.names.length
            ? c.names.map((n) => n.displayName)
            : ["Unknown"];
        const phones =
          c.phoneNumbers && c.phoneNumbers.length
            ? c.phoneNumbers.map((p) => p.value)
            : [];

        for (const raw of phones) {
          const normalized = (raw || "").replace(/\D/g, "");
          if (!normalized) continue;
          if (seen.has(normalized)) continue;
          seen.add(normalized);

          contactDocs.push({
            user: user._id,
            name: names[0] || "Unknown",
            phoneEncrypted: encrypt(normalized),
          });
        }
      }

      await Contact.deleteMany({ user: user._id });
      if (contactDocs.length > 0) {
        await Contact.insertMany(contactDocs);
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const redirectTo = `${process.env.FRONTEND_URL}/?token=${token}`;
    res.redirect(redirectTo);
  } catch (err) {
    console.error(
      "Google callback error:",
      err.response?.data || err.message || err
    );
    res.status(500).send("Google auth error");
  }
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
