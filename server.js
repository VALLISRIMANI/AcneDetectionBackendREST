import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./src/routes/auth.routes.js";

dotenv.config();

/**
 * ENVIRONMENT VALIDATION
 * These variables are required for production deployment
 */
const requiredEnvVars = [
  "JWT_SECRET",
  "MONGO_URI",
  "ML_API_URL"
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

// Validate environment variable formats
if (!process.env.MONGO_URI.includes("mongodb")) {
  console.error("FATAL: MONGO_URI must be a valid MongoDB connection string");
  process.exit(1);
}

if (!process.env.ML_API_URL.startsWith("http")) {
  console.error("FATAL: ML_API_URL must be a valid HTTP(S) URL");
  process.exit(1);
}

const app = express();

/**
 * MIDDLEWARE SETUP
 */

// Body parser with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Cookie parser
app.use(cookieParser());

/**
 * RATE LIMITING
 * Prevent brute force attacks and DoS
 */

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per windowMs
  message: { message: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for GET requests (status check, user count)
    return req.method === "GET";
  }
});

// General API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Apply limiters
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);
app.use("/api/auth/resend-otp", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

app.use("/api/", generalLimiter);

/**
 * DATABASE CONNECTION
 */
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
  .then(() => {
    console.log("✓ MongoDB Connected successfully");
  })
  .catch(err => {
    console.error("✗ MongoDB Connection Failed:", err.message);
    process.exit(1);
  });

/**
 * ROUTES
 */
app.use("/api/auth", authRoutes);

/**
 * HEALTH CHECK ENDPOINT
 */
app.get("/health", (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  return res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: mongoStatus,
    environment: process.env.NODE_ENV || "development"
  });
});

/**
 * 404 HANDLER
 */
app.use((req, res) => {
  return res.status(404).json({ message: "Endpoint not found" });
});

/**
 * ERROR HANDLER
 */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  
  // Multer file filter errors
  if (err.message && err.message.includes("Only JPG/JPEG")) {
    return res.status(400).json({ message: err.message });
  }
  
  return res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

/**
 * SERVER STARTUP
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
});
