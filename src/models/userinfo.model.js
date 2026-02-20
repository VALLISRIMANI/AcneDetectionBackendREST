import mongoose from "mongoose";

const userInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    ageGroup: String, 
    sex: String,
    skinType: String,
    acneDuration: String,
    acneLocation: [String],
    acneDescription: String,

    medicationAllergy: String,
    allergyReactionTypes: [String],
    acneMedicationReaction: [String],

    sensitiveSkin: String,
    foodAllergy: String,
    allergyFoods: [String],
    foodTriggersAcne: String,

    usingAcneProducts: String,
    currentProducts: [String],
    stoppedDueToSideEffects: String,

    dairyConsumption: String,
    stressLevel: String,
    sleepHours: String,

    additionalFeelings: String
  },
  { timestamps: true }
);

export default mongoose.model("UserInfo", userInfoSchema);
