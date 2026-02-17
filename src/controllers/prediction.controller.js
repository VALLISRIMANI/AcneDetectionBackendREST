import ImagePrediction from "../models/ImagePrediction.js";
import AcneProfile from "../models/AcneProfile.js";
import { sendToML } from "../services/ml.service.js";
import { calculateSeverity } from "../services/severity.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const uploadImage = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await ImagePrediction.countDocuments({
      userId,
      createdAt: { $gte: today }
    });

    if (count >= Number(process.env.IMAGE_UPLOAD_LIMIT_PER_DAY))
      throw new Error("Daily upload limit reached");

    if (!req.file) throw new Error("Image file required");

    const mlResult = await sendToML(req.file.buffer, req.file.originalname);

    if (mlResult.prediction === "unknown")
      throw new Error("Invalid facial image detected.");

    const profile = await AcneProfile.findOne({ userId });
    if (!profile) throw new Error("Complete profile first");

    const { score, finalSeverity, reason } = calculateSeverity(
      mlResult.prediction,
      profile
    );

    const prediction = await ImagePrediction.create({
      userId,
      imageUrl: mlResult.image_url,
      faceArea: req.body.faceArea,
      rawModelResponse: mlResult,
      predictionId: mlResult.prediction_id,
      mlPrediction: mlResult.prediction,
      confidence: mlResult.confidence,
      probabilities: mlResult.probabilities,
      finalSeverity,
      severityScore: score,
      adjustmentReason: reason
    });

    successResponse(res, prediction, "Prediction saved");
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const predictions = await ImagePrediction.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    successResponse(res, predictions);
  } catch (error) {
    next(error);
  }
};
// prediction.controller.js
