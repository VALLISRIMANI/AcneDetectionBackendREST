// ImagePrediction.js
import mongoose from "mongoose";

const imagePredictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    imageUrl: { type: String, required: true },
    faceArea: { type: String },

    rawModelResponse: { type: Object },

    predictionId: Number,
    mlPrediction: String,
    confidence: Number,
    probabilities: Object,

    finalSeverity: String,
    severityScore: Number,
    adjustmentReason: String
  },
  { timestamps: true }
);

export default mongoose.model("ImagePrediction", imagePredictionSchema);
