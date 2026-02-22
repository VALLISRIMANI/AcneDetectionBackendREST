import mongoose from "mongoose";

/**
 * DATABASE CONNECTION
 * Establishes MongoDB connection with optimized pool settings
 */
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log("✓ MongoDB Connected successfully");
  } catch (err) {
    console.error("✗ MongoDB Connection Failed:", err.message);
    process.exit(1);
  }
};

export default connectDB;
