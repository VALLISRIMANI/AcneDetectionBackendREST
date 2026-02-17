import express from "express";
import protect from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import {
  uploadImage,
  getHistory,
  startPredictionSession,
  getSessionHistory,
  completeSession
} from "../controllers/prediction.controller.js";

const router = express.Router();

// Start a new prediction session
router.post("/start-session", protect, startPredictionSession);

// Upload image to an existing session
router.post("/upload", protect, upload.single("image"), uploadImage);

// Get all predictions (with session info)
router.get("/history", protect, getHistory);

// Get all sessions with their predictions
router.get("/sessions", protect, getSessionHistory);

// Complete a prediction session
router.patch("/sessions/:sessionId/complete", protect, completeSession);

export default router;

