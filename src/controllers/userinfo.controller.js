import UserInfo from "../models/userinfo.model.js";
import UserAcneLevel from "../models/useracnelevel.model.js";

/**
 * Save user questionnaire responses
 * REQUIREMENTS:
 * - User must be authenticated
 * - Each user can only submit questionnaire once
 */
export const saveUserInfo = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid user context" });
    }

    const formData = { ...req.body };
    delete formData.userId; // Prevent injection

    // Check if user already submitted questionnaire
    const existing = await UserInfo.findOne({ userId });
    if (existing) {
      return res.status(409).json({ message: "Questionnaire already submitted" });
    }

    // Create questionnaire record
    const userInfo = await UserInfo.create({ userId, ...formData });

    return res.status(201).json({ 
      message: "Questionnaire saved successfully",
      questionnaire_id: userInfo._id
    });

  } catch (err) {
    console.error("Save user info error:", err);
    return res.status(500).json({ 
      message: "Failed to save questionnaire",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};

/**
 * Get user's completion status for both questionnaire and acne upload
 * REQUIREMENTS:
 * - User must be authenticated
 * RETURNS:
 * - questionnaire_completed: boolean
 * - acne_analysis_completed: boolean
 * - message: next step recommendation
 */
export const getUserStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid user context" });
    }

    const userInfo = await UserInfo.findOne({ userId });
    const acneLevel = await UserAcneLevel.findOne({ userId });

    const questionnaireCompleted = !!userInfo;
    const acneAnalysisCompleted = !!acneLevel;

    let nextStep = "";
    if (!questionnaireCompleted) {
      nextStep = "Complete the health questionnaire";
    } else if (!acneAnalysisCompleted) {
      nextStep = "Upload acne images for analysis";
    } else {
      nextStep = "All steps completed - proceed to dashboard";
    }

    return res.status(200).json({
      questionnaire_completed: questionnaireCompleted,
      acne_analysis_completed: acneAnalysisCompleted,
      both_completed: questionnaireCompleted && acneAnalysisCompleted,
      next_step: nextStep
    });

  } catch (err) {
    console.error("Get user status error:", err);
    return res.status(500).json({ 
      message: "Failed to fetch user status",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};
