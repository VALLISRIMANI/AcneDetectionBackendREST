// auth.routes.js
import express from "express";
import {
  register,
  sendOtp,
  verifyOtp,
  login,
  refreshToken,
  logout
} from "../controllers/auth.controller.js";
import protect from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);

export default router;
