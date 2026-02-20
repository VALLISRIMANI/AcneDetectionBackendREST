import axios from "axios";
import FormData from "form-data";
import UserAcneLevel from "../models/useracnelevel.model.js";
import UserInfo from "../models/userinfo.model.js";

export const uploadAcneImages = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid user context" });
    }

    // 1️⃣ Ensure questionnaire completed
    const userInfo = await UserInfo.findOne({ userId });
    if (!userInfo) {
      return res.status(400).json({
        message: "Complete questionnaire before uploading acne images"
      });
    }

    // 2️⃣ Prevent duplicate submission
    const existing = await UserAcneLevel.findOne({ userId });
    if (existing) {
      return res.status(409).json({
        message: "Acne analysis already completed for this user"
      });
    }

    // 3️⃣ Validate uploaded files
    const files = req.files;
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ message: "At least one image required" });
    }

    const mlApiUrl = process.env.ML_API_URL;
    if (!mlApiUrl) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const areasResults = [];
    const fieldnames = Object.keys(files);

    // 4️⃣ Sequential processing
    for (const fieldname of fieldnames) {
      const filesInField = files[fieldname];

      for (const file of filesInField) {

        const form = new FormData();
        form.append("image", file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });

        let mlResponse;

        try {
          mlResponse = await axios.post(mlApiUrl, form, {
            headers: form.getHeaders(),
            timeout: 30000
          });
        } catch (err) {
          return res.status(502).json({
            message: `ML API failed for area: ${fieldname}`
          });
        }

        const result = mlResponse.data;

        // 5️⃣ Strict validation (FIXED 0-value bug)
        if (
          typeof result.prediction !== "string" ||
          typeof result.confidence !== "number" ||
          typeof result.prediction_id !== "number" ||
          typeof result.image_url !== "string" ||
          typeof result.probabilities !== "object"
        ) {
          return res.status(502).json({
            message: `Invalid ML response for area: ${fieldname}`
          });
        }

        const probs = result.probabilities;

        const requiredKeys = ["cleanskin", "mild", "moderate", "severe", "unknown"];

        for (const key of requiredKeys) {
          if (typeof probs[key] !== "number") {
            return res.status(502).json({
              message: `Invalid probabilities structure for area: ${fieldname}`
            });
          }
        }

        if (result.confidence < 0 || result.confidence > 100) {
          return res.status(502).json({
            message: `Invalid confidence value for area: ${fieldname}`
          });
        }

        // 6️⃣ Push validated result
        areasResults.push({
          area: fieldname,
          imageName: file.originalname,
          imageUrl: result.image_url,
          prediction: result.prediction,
          confidence: result.confidence,
          probabilities: {
            cleanskin: probs.cleanskin,
            mild: probs.mild,
            moderate: probs.moderate,
            severe: probs.severe,
            unknown: probs.unknown
          },
          predictionId: result.prediction_id
        });
      }
    }

    // 7️⃣ Atomic save
    await UserAcneLevel.create({
      userId,
      areas: areasResults
    });

    // 8️⃣ Success response
    return res.status(200).json({
      message: "Acne analysis completed",
      areas: areasResults
    });

  } catch (err) {
    console.error("Acne upload error:", err);
    return res.status(500).json({
      message: "Failed to process acne images"
    });
  }
};