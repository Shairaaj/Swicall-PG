// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String }, // for local signup
    googleId: { type: String }, // for Google OAuth
    primaryDeviceId: { type: String }, // GUID of registered device
  },
  { timestamps: true }
);

// Helpful index for googleId if you want
userSchema.index({ googleId: 1 });

export default mongoose.model("User", userSchema);
