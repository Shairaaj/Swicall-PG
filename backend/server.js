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

const PORT = process.env.PORT || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://swicall-pg.vercel.app";
const BACKEND_URL =
  process.env.BACKEND_URL || "https://swicall-pg.onrender.com";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || `${BACKEND_URL}/auth/google/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET || "swicall-session-secret";
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret";
const AES_SECRET_VALUE = process.env.AES_SECRET || "your_32_character_secret";

const app = express();

app.use(express.json());
// ---------- CORS ----------
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-Id"],
  }),
);

// ---------- Session (only for Google OAuth state: deviceId etc.) ----------
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 5 * 60 * 1000, // 5 minutes
    },
  }),
);

// ---------- API Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);

const cleanupContactIndexes = async () => {
  try {
    const indexes = await Contact.collection.indexes();
    const legacyNameIndex = indexes.find(
      (index) => index.name === "name_1" && index.unique,
    );
    if (legacyNameIndex) {
      await Contact.collection.dropIndex("name_1");
      console.log("Dropped legacy unique index on Contact.name");
    }
  } catch (err) {
    if (err.codeName !== "IndexNotFound") {
      console.error("Contact index cleanup failed:", err.message || err);
    }
  }
};

// ---------- Google OAuth setup ----------
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || "",
  process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_REDIRECT_URI,
);

const SCOPES = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

const encrypt = (text) =>
  CryptoJS.AES.encrypt(text, AES_SECRET_VALUE).toString();

/**
 * Step 1: Redirect user to Google consent screen.
 * Frontend should call: GET /auth/google?deviceId=<GUID>
 */
app.get("/auth/google", (req, res) => {
  const { deviceId } = req.query;
  console.log("====== /auth/google ======");
  console.log(req.query);
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
  console.log("====== CALLBACK HIT ======");
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("No code provided");

    const { tokens } = await oauth2Client.getToken(code);
    console.log("Token received");
    console.log(tokens);
    const access_token = tokens.access_token;

    // Get user info
    const profileRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );
    const profile = profileRes.data;
    console.log(profile);

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

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const redirectTo = `${FRONTEND_URL}/?token=${token}`;
    res.redirect(redirectTo);
  } catch (err) {
    console.error("========== GOOGLE CALLBACK ERROR ==========");
    console.error(err);

    if (err.response) {
      console.error("Response data:", err.response.data);
      console.error("Status:", err.response.status);
    }

    console.error("Message:", err.message);
    console.error("Stack:", err.stack);

    res.status(500).send(err.message);
  }
});

// ---------- Start server ----------
const startServer = async () => {
  await connectDB();
  await cleanupContactIndexes();
  app.listen(PORT, () =>
    console.log(`Backend running on http://localhost:${PORT}`),
  );
};

startServer().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
