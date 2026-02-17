import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./src/config/db.js";
import corsOptions from "./src/config/cors.js";
import { globalLimiter } from "./src/config/rateLimiter.js";
import errorHandler from "./src/middlewares/error.middleware.js";
import authRoutes from "./src/routes/auth.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import predictionRoutes from "./src/routes/prediction.routes.js";

dotenv.config();

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(globalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/prediction", predictionRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Acne AI Backend Running",
    environment: process.env.NODE_ENV,
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
