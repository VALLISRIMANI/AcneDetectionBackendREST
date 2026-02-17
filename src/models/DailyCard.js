import mongoose from "mongoose";

/**
 * DailyCard Schema
 * Represents individual daily treatment guidance
 * Created from TreatmentPlan AI response
 */
const dailyCardSchema = new mongoose.Schema(
  {
    treatmentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreatmentPlan",
      required: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    dayNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 15
    },

    morning: {
      type: String,
      required: true,
      minlength: 10
    },

    afternoon: {
      type: String,
      required: true,
      minlength: 5
    },

    evening: {
      type: String,
      required: true,
      minlength: 10
    },

    lifestyleTips: {
      type: String,
      required: true,
      minlength: 5
    },

    completed: {
      type: Boolean,
      default: false,
      index: true
    },

    notes: {
      type: String,
      default: null
    },

    userFeedback: {
      isEffective: {
        type: Boolean,
        default: null
      },
      comment: {
        type: String,
        default: null
      },
      recordedAt: {
        type: Date,
        default: null
      }
    }
  },
  { 
    timestamps: true,
    indexes: [
      { treatmentPlanId: 1, dayNumber: 1 },
      { userId: 1, dayNumber: 1 }
    ]
  }
);

export default mongoose.model("DailyCard", dailyCardSchema);

