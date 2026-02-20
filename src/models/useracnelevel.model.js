import mongoose from "mongoose";

const userAcneLevelSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    areas: [
      {
        area: {
          type: String,
          required: true,
          enum: ["forehead", "leftCheek", "rightCheek", "chin", "neck", "back", "fullFace"]
        },
        imageName: {
          type: String,
          required: true
        },
        imageUrl: {
          type: String,
          required: true
        },
        prediction: {
          type: String,
          required: true,
          enum: ["cleanskin", "mild", "moderate", "severe", "unknown"]
        },
        confidence: {
          type: Number,
          required: true,
          min: 0,
          max: 100
        },
        probabilities: {
          cleanskin: {
            type: Number,
            required: true,
            min: 0,
            max: 100
          },
          mild: {
            type: Number,
            required: true,
            min: 0,
            max: 100
          },
          moderate: {
            type: Number,
            required: true,
            min: 0,
            max: 100
          },
          severe: {
            type: Number,
            required: true,
            min: 0,
            max: 100
          },
          unknown: {
            type: Number,
            required: true,
            min: 0,
            max: 100
          }
        },
        predictionId: {
          type: Number,
          required: true
        }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("UserAcneLevel", userAcneLevelSchema);