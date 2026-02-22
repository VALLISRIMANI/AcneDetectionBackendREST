import express from "express";
import {
  generateDayOnePlan,
  submitDayReview,
  getTreatmentStatus
} from "../controllers/treatment.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/start", authMiddleware, generateDayOnePlan);
router.post("/review", authMiddleware, submitDayReview);
router.get("/status", authMiddleware, getTreatmentStatus);

export default router;