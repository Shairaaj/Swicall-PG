// routes/contactRoutes.js
import express from "express";
import CryptoJS from "crypto-js";
import Contact from "../models/Contact.js";
import { verifyJWT } from "../middleware/authMiddleware.js";
import { requirePrimaryDevice } from "../middleware/deviceMiddleware.js";

const router = express.Router();

const encrypt = (text) =>
  CryptoJS.AES.encrypt(text, process.env.AES_SECRET).toString();

const decrypt = (cipher) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, process.env.AES_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
};

// READ – any authenticated device
router.get("/", verifyJWT, async (req, res) => {
  try {
    const docs = await Contact.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    const contacts = docs.map((d) => ({
      id: d._id,
      name: d.name,
      phone: decrypt(d.phoneEncrypted),
    }));

    res.json(contacts);
  } catch (err) {
    console.error("GET /contacts error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// CREATE – primary device only
router.post("/", verifyJWT, requirePrimaryDevice, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const phoneEncrypted = encrypt(phone);

    const existing = await Contact.findOne({
      user: req.user._id,
      phoneEncrypted,
    });
    if (existing) {
      return res.status(409).json({ error: "Contact already exists" });
    }

    const doc = await Contact.create({
      user: req.user._id,
      name: name || "Unknown",
      phoneEncrypted,
    });

    res.status(201).json({
      id: doc._id,
      name: doc.name,
      phone,
    });
  } catch (err) {
    console.error("POST /contacts error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE – primary device only
router.put("/:id", verifyJWT, requirePrimaryDevice, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phoneEncrypted = encrypt(phone);

    const doc = await Contact.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      update,
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json({
      id: doc._id,
      name: doc.name,
      phone: decrypt(doc.phoneEncrypted),
    });
  } catch (err) {
    console.error("PUT /contacts/:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE – primary device only
router.delete("/:id", verifyJWT, requirePrimaryDevice, async (req, res) => {
  try {
    const doc = await Contact.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!doc) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /contacts/:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// SYNC – from manual sources (if used later)
router.post("/sync", verifyJWT, requirePrimaryDevice, async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: "contacts array required" });
    }

    const seen = new Set();
    const toInsert = [];

    for (const c of contacts) {
      const rawPhone = c.phone || "";
      const normalized = rawPhone.replace(/\D/g, "");
      if (!normalized) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      toInsert.push({
        user: req.user._id,
        name: c.name || "Unknown",
        phoneEncrypted: encrypt(normalized),
      });
    }

    if (toInsert.length > 0) {
      await Contact.insertMany(toInsert);
    }

    res.json({ success: true, inserted: toInsert.length });
  } catch (err) {
    console.error("POST /contacts/sync error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
