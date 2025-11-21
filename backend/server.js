import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { google } from "googleapis";
import cors from "cors";
import contactRoutes from "./routes/contactRoutes.js";
import connectDB from "./config/db.js";
import contactModel from "./models/contactModel.js";

dotenv.config();
const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());


//google api middlewares

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

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

app.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  console.log("code: ",code);
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("tokens: ",tokens);
    oauth2Client.setCredentials(tokens);

    req.session.tokens = tokens;

    res.redirect(process.env.FRONTEND_URL + "/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Authentication Error");
  }
});

app.get("/api/contacts", async (req, res) => {
  if (!req.session.tokens)
    return res.status(401).json({ error: "User not authenticated" });
  console.log("Scopes in token:", oauth2Client.credentials.scope);

  oauth2Client.setCredentials(req.session.tokens);

  const people = google.people({ version: "v1", auth: oauth2Client });

  try {
    const response = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 50,
      personFields: "names,emailAddresses,phoneNumbers",
    });

    res.json(response.data.connections || []);
    await contactModel.insertOne(response.data.connections);
    console.log("data inserted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching contacts");
  }
});

//middlewares routes

app.use("/contacts",contactRoutes);

app.listen(5000, () =>
  console.log("Backend running on http://localhost:5000")
);