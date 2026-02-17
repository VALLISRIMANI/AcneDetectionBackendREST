// profile.routes.js
import express from "express";
import protect from "../middlewares/auth.middleware.js";
import {
  completeProfile,
  getMyProfile
} from "../controllers/profile.controller.js";

const router = express.Router();

router.post("/complete-profile", protect, completeProfile);
router.get("/me", protect, getMyProfile);

export default router;
