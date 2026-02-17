import express from "express";
import protect from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import {
  uploadImage,
  getHistory
} from "../controllers/prediction.controller.js";

const router = express.Router();

router.post("/upload", protect, upload.single("image"), uploadImage);
router.get("/history", protect, getHistory);

export default router;
// prediction.routes.js
