import ImagePrediction from "../models/ImagePrediction.js";
import PredictionSession from "../models/PredictionSession.js";
import AcneProfile from "../models/AcneProfile.js";
import { sendToML } from "../services/ml.service.js";
import { calculateSeverity } from "../services/severity.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const startPredictionSession = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const session = await PredictionSession.create({
      userId,
      status: "in_progress",
      predictions: []
    });

    successResponse(res, session, "Prediction session started");
  } catch (error) {
    next(error);
  }
};

export const uploadImage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { predictionSessionId } = req.body;

    // Validate predictionSessionId
    if (!predictionSessionId)
      throw new Error("predictionSessionId is required");

    const session = await PredictionSession.findById(predictionSessionId);
    if (!session) throw new Error("Prediction session not found");

    if (session.userId.toString() !== userId.toString())
      throw new Error("Unauthorized: session does not belong to you");

    if (session.status !== "in_progress")
      throw new Error("Prediction session is not in progress");

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
      predictionSessionId,
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

    // Add prediction ID to session
    await PredictionSession.findByIdAndUpdate(
      predictionSessionId,
      { $push: { predictions: prediction._id } },
      { new: true }
    );

    successResponse(res, prediction, "Prediction saved");
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const predictions = await ImagePrediction.find({
      userId: req.user._id
    })
      .populate("predictionSessionId")
      .sort({ createdAt: -1 });

    successResponse(res, predictions);
  } catch (error) {
    next(error);
  }
};

export const getSessionHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const sessions = await PredictionSession.find({ userId })
      .populate({
        path: "predictions",
        model: "ImagePrediction"
      })
      .sort({ createdAt: -1 });

    successResponse(res, sessions, "Session history retrieved");
  } catch (error) {
    next(error);
  }
};

export const completeSession = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;

    const session = await PredictionSession.findById(sessionId);
    if (!session) throw new Error("Session not found");

    if (session.userId.toString() !== userId.toString())
      throw new Error("Unauthorized: session does not belong to you");

    session.status = "completed";
    await session.save();

    successResponse(res, session, "Prediction session completed");
  } catch (error) {
    next(error);
  }
};

