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

    predictions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ImagePrediction"
      }
    ],

    sessionFinalSeverity: {
      type: String,
      enum: ["cleanskin", "mild", "moderate", "moderate-severe", "severe"]
    },

    sessionSeverityScore: {
      type: Number
    },

    dominantArea: {
      type: String,
      enum: ["forehead", "leftcheek", "rightcheek", "chin", "full_face"]
    },

    aggregationReason: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("PredictionSession", predictionSessionSchema);
