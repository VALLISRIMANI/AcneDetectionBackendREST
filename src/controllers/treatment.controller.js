/**
 * Treatment Controller
 * Handles treatment plan generation with strict validation
 */

import PredictionSession from "../models/PredictionSession.js";
import AcneProfile from "../models/AcneProfile.js";
import TreatmentPlan from "../models/TreatmentPlan.js";
import DailyCard from "../models/DailyCard.js";
import { generateTreatmentFromGrok } from "../services/grok.service.js";
import { buildTreatmentPrompt } from "../prompts/treatment.prompt.js";

/**
 * Generate treatment plan for a completed prediction session
 * 
 * Workflow:
 * 1. Validate session exists and is completed
 * 2. Get user profile for personalization
 * 3. Build strict prompt
 * 4. Call Groq API (with automatic retry on validation failure)
 * 5. Store validated plan in TreatmentPlan model
 * 6. Create DailyCard entries for each day
 * 7. Return structured response
 * 
 * @route POST /api/treatment/generate
 * @body { sessionId: string }
 * @returns { success: bool, message: string, data: TreatmentPlan }
 */
export const generateTreatment = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;

    // ============ VALIDATION ============
    
    // Validate session exists and is completed
    const session = await PredictionSession.findById(sessionId);
    if (!session || session.status !== "completed") {
      throw {
        status: 400,
        message: "Session not found or not completed"
      };
    }

    // Get user profile for context
    const profile = await AcneProfile.findOne({ userId });
    if (!profile) {
      throw {
        status: 404,
        message: "Acne profile not found. Complete profile setup first."
      };
    }

    // Check if active plan already exists for this session
    const existingActivePlan = await TreatmentPlan.findOne({
      predictionSessionId: sessionId,
      isActive: true
    });

    if (existingActivePlan) {
      return res.json({
        success: true,
        message: "Active treatment plan already exists for this session",
        data: existingActivePlan,
        isExisting: true
      });
    }

    // ============ AI GENERATION ============

    // Build strict prompt
    const prompt = buildTreatmentPrompt(
      {
        severity: session.sessionFinalSeverity,
        dominantArea: session.dominantArea
      },
      {
        skinType: profile.skinType,
        sensitiveSkin: profile.sensitiveSkin,
        stressLevel: profile.stressLevel,
        sleepHours: profile.sleepHours,
        allergyFoods: profile.allergyFoods
      }
    );

    // Generate from Groq (includes validation + retry)
    const validatedPlan = await generateTreatmentFromGrok(prompt);

    // ============ STORAGE ============

    // Store validated plan
    const treatment = await TreatmentPlan.create({
      userId,
      predictionSessionId: sessionId,
      severity: session.sessionFinalSeverity,
      treatmentPlan: validatedPlan, // Store validated plan, not raw response
      status: "active",
      isActive: true,
      generatedBy: "grok_api",
      generationMetadata: {
        groqModel: "llama-3.3-70b-versatile",
        retriesUsed: 0,
        generationTimeMs: Math.round(Date.now() - startTime),
        validatedAt: new Date()
      }
    });

    // ============ CREATE DAILY CARDS ============

    // Create individual daily cards for UI consumption
    const dailyCards = validatedPlan.days.map(day => ({
      treatmentPlanId: treatment._id,
      userId,
      dayNumber: day.dayNumber,
      morning: day.morning,
      afternoon: day.afternoon,
      evening: day.evening,
      lifestyleTips: day.lifestyleTips,
      completed: false
    }));

    await DailyCard.insertMany(dailyCards);

    // ============ RESPONSE ============

    return res.json({
      success: true,
      message: "Treatment plan generated and validated",
      data: treatment,
      stats: {
        daysCreated: dailyCards.length,
        generationTimeMs: Math.round(Date.now() - startTime)
      }
    });

  } catch (error) {
    // Ensure error has proper structure
    if (!error.status) {
      error.status = 500;
    }
    next(error);
  }
};

/**
 * Retrieve treatment plan for a session
 * 
 * @route GET /api/treatment/:sessionId
 * @returns { success: bool, data: TreatmentPlan }
 */
export const getTreatment = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const treatment = await TreatmentPlan.findOne({
      predictionSessionId: sessionId,
      userId,
      isActive: true
    });

    if (!treatment) {
      throw {
        status: 404,
        message: "Treatment plan not found"
      };
    }

    res.json({
      success: true,
      data: treatment
    });

  } catch (error) {
    if (!error.status) {
      error.status = 500;
    }
    next(error);
  }
};

/**
 * Get daily cards for a treatment plan
 * 
 * @route GET /api/treatment/:treatmentPlanId/daily-cards
 * @returns { success: bool, data: DailyCard[] }
 */
export const getDailyCards = async (req, res, next) => {
  try {
    const { treatmentPlanId } = req.params;
    const userId = req.user._id;

    const dailyCards = await DailyCard.find({
      treatmentPlanId,
      userId
    }).sort({ dayNumber: 1 });

    if (!dailyCards.length) {
      throw {
        status: 404,
        message: "No daily cards found"
      };
    }

    res.json({
      success: true,
      data: dailyCards,
      total: dailyCards.length
    });

  } catch (error) {
    if (!error.status) {
      error.status = 500;
    }
    next(error);
  }
};

/**
 * Mark daily card as completed
 * 
 * @route PATCH /api/treatment/daily-card/:cardId/complete
 * @returns { success: bool, data: DailyCard }
 */
export const completeDailyCard = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { notes, feedback } = req.body;
    const userId = req.user._id;

    const dailyCard = await DailyCard.findOneAndUpdate(
      { _id: cardId, userId },
      {
        completed: true,
        notes: notes || null,
        "userFeedback.recordedAt": new Date(),
        ...(feedback && {
          "userFeedback.isEffective": feedback.isEffective || null,
          "userFeedback.comment": feedback.comment || null
        })
      },
      { new: true }
    );

    if (!dailyCard) {
      throw {
        status: 404,
        message: "Daily card not found"
      };
    }

    res.json({
      success: true,
      message: "Daily card marked as completed",
      data: dailyCard
    });

  } catch (error) {
    if (!error.status) {
      error.status = 500;
    }
    next(error);
  }
};

export default {
  generateTreatment,
  getTreatment,
  getDailyCards,
  completeDailyCard
};

