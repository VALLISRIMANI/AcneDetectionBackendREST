import express from "express";
import protect from "../middlewares/auth.middleware.js";
import { generateTreatment } from "../controllers/treatment.controller.js";

const router = express.Router();

router.post("/generate", protect, generateTreatment);

export default router;
// treatment.routes.js
