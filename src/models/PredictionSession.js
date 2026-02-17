// PredictionSession.js
import mongoose from "mongoose";

const predictionSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress"
    },

    predictions: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "ImagePrediction",
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model("PredictionSession", predictionSessionSchema);
