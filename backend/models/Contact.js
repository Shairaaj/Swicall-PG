// models/Contact.js
import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String },
    phoneEncrypted: { type: String, required: true }, // AES encrypted phone
  },
  { timestamps: true },
);

// Prevent duplicate phone records for the same user
contactSchema.index({ user: 1, phoneEncrypted: 1 }, { unique: true });

export default mongoose.model("Contact", contactSchema);
