// models/Contact.js
import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String },
    phoneEncrypted: { type: String, required: true, unique:true }, // AES encrypted phone
  },
  { timestamps: true }
);

// For duplicate detection (optional but good)
contactSchema.index({ user: 1, phoneEncrypted: 1 });

export default mongoose.model("Contact", contactSchema);
