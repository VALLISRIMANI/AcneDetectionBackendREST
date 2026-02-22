import mongoose from "mongoose";

const treatmentDaySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  morning: {
    treatment: { type: String, required: true },
    completed: { type: Boolean, default: false }
  },
  afternoon: {
    treatment: { type: String, required: true },
    completed: { type: Boolean, default: false }
  },
  evening: {
    treatment: { type: String, required: true },
    completed: { type: Boolean, default: false }
  },
  motivation: { type: String, default: "" },
  adjustment_reason: { type: String, default: "" },
  feedback: { type: String, enum: ["positive", "negative", null], default: null },
  notes: { type: String, default: "" },
  review: { type: String, default: "" }
}, { _id: false });

const treatmentPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    overallSeverity: {
      type: String,
      enum: ["cleanskin", "mild", "moderate", "moderate-severe", "severe"],
      required: true
    },
    questionnaire_completed: { type: Boolean, default: true },
    acne_analysis_completed: { type: Boolean, default: true },
    currentDay: { type: Number, default: 1 },
    days: {
      type: [treatmentDaySchema],
      validate: {
        validator: function (v) {
          return v.length <= 365;
        },
        message: "Treatment plan cannot exceed 365 days"
      }
    }
  },
  { timestamps: true }
);

export default mongoose.model("TreatmentPlan", treatmentPlanSchema);