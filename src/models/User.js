// User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    refreshToken: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
