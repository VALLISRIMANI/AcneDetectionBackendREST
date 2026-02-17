// AcneProfile.js
import mongoose from "mongoose";

const acneProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    ageGroup: String,
    ageScore: Number,

    sex: String,

    skinType: String,
    skinScore: Number,
    sensitiveSkin: Boolean,

    acneDuration: String,
    durationScore: Number,
    acneLocation: [String],
    acneType: String,

    hasMedicationAllergy: Boolean,
    reactionTypes: [String],
    badReactionsTo: [String],

    hasFoodAllergy: Boolean,
    allergyFoods: [String],
    foodsWorsenAcne: Boolean,

    usingTreatment: Boolean,
    currentProducts: [String],
    stoppedDueToSideEffects: Boolean,

    dairyFrequency: String,
    stressLevel: String,
    stressScore: Number,
    sleepHours: String,
    sleepScore: Number,

    address: String,
    userFeeling: String
  },
  { timestamps: true }
);

export default mongoose.model("AcneProfile", acneProfileSchema);
