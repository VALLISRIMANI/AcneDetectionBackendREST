import UserInfo from "../models/userinfo.model.js";
import UserAcneLevel from "../models/useracnelevel.model.js";
import TreatmentPlan from "../models/treatmentplan.model.js";
import { deriveOverallSeverity } from "../utils/severity.util.js";
import { callGroq } from "../utils/groq.utils.js";

// ─── Prompt Builders ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a certified dermatology AI assistant.
You must respond with ONLY a valid JSON object. No markdown. No explanation. No extra text.
The JSON must have exactly these string fields:
{
  "morning": "...",
  "afternoon": "...",
  "evening": "...",
  "motivation": "...",
  "adjustment_reason": "..."
}
Follow strict dermatology safety rules. Never suggest isotretinoin or hormonal pills.
For severe acne, always include: "Severe acne requires dermatologist supervision to prevent scarring."`;

const buildDayOnePrompt = (userInfo, severity, areas) => {
  const areasSummary = areas.map(a => `${a.area}: ${a.prediction} (${a.confidence.toFixed(1)}%)`).join(", ");

  return `Generate a Day 1 acne treatment plan.

Patient Profile:
- Age Group: ${userInfo.ageGroup || "Unknown"}
- Sex: ${userInfo.sex || "Unknown"}
- Skin Type: ${userInfo.skinType || "Unknown"}
- Acne Duration: ${userInfo.acneDuration || "Unknown"}
- Acne Locations: ${(userInfo.acneLocation || []).join(", ") || "Unknown"}
- Sensitive Skin: ${userInfo.sensitiveSkin || "Unknown"}
- Medication Allergy: ${userInfo.medicationAllergy || "No"}
- Allergy Reaction Types: ${(userInfo.allergyReactionTypes || []).join(", ") || "None"}
- Acne Medication Reactions: ${(userInfo.acneMedicationReaction || []).join(", ") || "None"}
- Currently Using Acne Products: ${userInfo.usingAcneProducts || "No"}
- Current Products: ${(userInfo.currentProducts || []).join(", ") || "None"}
- Stress Level: ${userInfo.stressLevel || "Unknown"}
- Sleep Hours: ${userInfo.sleepHours || "Unknown"}
- Dairy Consumption: ${userInfo.dairyConsumption || "Unknown"}

Acne Analysis:
- Overall Severity: ${severity}
- Area Breakdown: ${areasSummary}

Dermatology Rules for ${severity}:
${getDermatologyRules(severity, userInfo)}

Generate the Day 1 morning/afternoon/evening treatment plan following these rules strictly.
Set adjustment_reason to "Initial plan based on assessment".`;
};

const buildNextDayPrompt = (userInfo, severity, previousDay, feedback, notes, nextDayNum) => {
  return `Generate Day ${nextDayNum} acne treatment plan based on Day ${previousDay.day} feedback.

Patient Severity: ${severity}
Sensitive Skin: ${userInfo.sensitiveSkin || "Unknown"}
Medication Allergy: ${userInfo.medicationAllergy || "No"}

Previous Day ${previousDay.day} Plan:
- Morning: ${previousDay.morning.treatment}
- Afternoon: ${previousDay.afternoon.treatment}
- Evening: ${previousDay.evening.treatment}

User Feedback: ${feedback}
User Notes: ${notes || "None"}

Instructions:
${feedback === "positive"
    ? "The treatment is working. Continue a similar plan with minor positive progression. Increase motivation."
    : "The treatment caused issues. Reduce concentration by ~25%, use gentler alternatives, explain the adjustment."}

Dermatology Rules:
${getDermatologyRules(severity, userInfo)}

Respond with Day ${nextDayNum} plan. Set adjustment_reason to explain what changed and why.`;
};

const getDermatologyRules = (severity, userInfo) => {
  const sensitive = userInfo.sensitiveSkin === "Yes";

  const rules = {
    cleanskin: `Morning: Gentle face wash, oil-free moisturizer, SPF sunscreen.
Afternoon: Blotting paper if oily, hydrating mist.
Evening: Gentle cleanser, light moisturizer.`,

    mild: `Morning: Gentle face wash, Salicylic acid 0.5-2%, oil-free paraben-free moisturizer, SPF sunscreen.
Afternoon: Blotting if oily, avoid touching face.
Evening: Gentle cleanser, ${sensitive ? "Azelaic acid 10-15% (sensitive skin alternative)" : "Adapalene 0.1% (alternate nights first week)"}, light moisturizer.`,

    moderate: `Morning: Salicylic acid wash, Clindamycin 1% gel, oil-free moisturizer, SPF sunscreen.
Afternoon: Avoid sun exposure, blotting if needed.
Evening: ${sensitive ? "Azelaic acid 15%" : "Adapalene 0.1% or Tretinoin 0.025%"}, alternate with Benzoyl peroxide 2.5% on other nights.`,

    "moderate-severe": `Morning: Benzoyl peroxide 2.5% wash, Clindamycin 1% (short-term max 12 weeks), oil-free moisturizer, SPF sunscreen.
Afternoon: Strict sun avoidance, hydration.
Evening: Adapalene 0.1% or Tretinoin 0.025%. Oral: Doxycycline 50-100mg (max 14-15 days, doctor prescribed only).`,

    severe: `Morning: Gentle non-comedogenic cleanser, Benzoyl peroxide 2.5% spot treatment, oil-free moisturizer.
Afternoon: Do NOT pick or squeeze. Hydrate well.
Evening: Adapalene 0.1% or Azelaic acid 15-20%.
WARNING: Severe acne requires dermatologist supervision to prevent scarring. DO NOT use isotretinoin without prescription. DO NOT use hormonal pills without medical supervision.`
  };

  return rules[severity] || rules.mild;
};

// ─── Controllers ────────────────────────────────────────────────────────────

export const generateDayOnePlan = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Check prerequisites
    const userInfo = await UserInfo.findOne({ userId });
    if (!userInfo) {
      return res.status(400).json({ message: "Complete questionnaire first" });
    }

    const acneLevel = await UserAcneLevel.findOne({ userId });
    if (!acneLevel) {
      return res.status(400).json({ message: "Complete acne analysis first" });
    }

    // Prevent duplicate
    const existing = await TreatmentPlan.findOne({ userId });
    if (existing) {
      return res.status(409).json({
        message: "Treatment plan already started",
        currentDay: existing.currentDay
      });
    }

    // Derive severity
    const overallSeverity = deriveOverallSeverity(acneLevel.areas);

    // Build prompt and call GROQ
    const userPrompt = buildDayOnePrompt(userInfo, overallSeverity, acneLevel.areas);
    let aiPlan;
    try {
      aiPlan = await callGroq(SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      console.error("GROQ Error:", err.message);
      return res.status(502).json({ message: "AI service unavailable. Try again." });
    }

    // Save plan with race condition handling
    let plan;
    try {
      plan = await TreatmentPlan.create({
      userId,
      overallSeverity,
      questionnaire_completed: true,
      acne_analysis_completed: true,
      currentDay: 1,
      days: [
        {
          day: 1,
          morning: { treatment: aiPlan.morning, completed: false },
          afternoon: { treatment: aiPlan.afternoon, completed: false },
          evening: { treatment: aiPlan.evening, completed: false },
          motivation: aiPlan.motivation,
          adjustment_reason: aiPlan.adjustment_reason
        }
      ]
    });
    } catch (err) {
      // 6️⃣ FIX: Handle duplicate key race condition
      if (err.code === 11000) {
        const existing = await TreatmentPlan.findOne({ userId });
        return res.status(409).json({
          message: "Treatment plan already started",
          currentDay: existing.currentDay
        });
      }
      throw err;
    }

    return res.status(200).json({
      message: "Day 1 treatment generated",
      day: 1,
      overallSeverity,
      plan: {
        morning: aiPlan.morning,
        afternoon: aiPlan.afternoon,
        evening: aiPlan.evening,
        motivation: aiPlan.motivation
      }
    });

  } catch (err) {
    console.error("Generate Day 1 Error:", err);
    return res.status(500).json({ message: "Failed to generate treatment plan" });
  }
};

export const submitDayReview = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { day, feedback, notes } = req.body || {};

    if (!day || !feedback) {
      return res.status(400).json({ message: "day and feedback are required" });
    }

    // 7️⃣ FIX: Cast day to Number with type validation
    const dayNum = Number(day);
    if (isNaN(dayNum) || !Number.isInteger(dayNum) || dayNum < 1) {
      return res.status(400).json({ message: "day must be a valid positive integer" });
    }

    if (!["positive", "negative"].includes(feedback)) {
      return res.status(400).json({ message: "feedback must be 'positive' or 'negative'" });
    }

    const treatmentPlan = await TreatmentPlan.findOne({ userId });
    if (!treatmentPlan) {
      return res.status(404).json({ message: "No treatment plan found. Generate Day 1 first." });
    }

    // Prevent skipping days
    if (dayNum !== treatmentPlan.currentDay) {
      return res.status(400).json({
        message: `Cannot review Day ${dayNum}. Current day is ${treatmentPlan.currentDay}.`
      });
    }

    // Prevent re-reviewing
    const currentDayData = treatmentPlan.days.find(d => d.day === dayNum);
    if (!currentDayData) {
      return res.status(400).json({ message: `Day ${dayNum} plan not found` });
    }
    if (currentDayData.feedback) {
      return res.status(409).json({ message: `Day ${dayNum} already reviewed` });
    }

    // Fetch userInfo for next day prompt
    const userInfo = await UserInfo.findOne({ userId });
    if (!userInfo) {
      return res.status(400).json({ message: "User questionnaire not found" });
    }

    // Generate next day
    const nextDayNum = dayNum + 1;
    const userPrompt = buildNextDayPrompt(
      userInfo,
      treatmentPlan.overallSeverity,
      currentDayData,
      feedback,
      notes,
      nextDayNum
    );

    let aiPlan;
    try {
      aiPlan = await callGroq(SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      console.error("GROQ Error:", err.message);
      return res.status(502).json({ message: "AI service unavailable. Try again." });
    }

    // Prevent days array from exceeding 365 days
    if (treatmentPlan.days.length >= 365) {
      return res.status(400).json({
        message: "Treatment plan duration has reached 365 days maximum"
      });
    }

    // 1️⃣ Update current day feedback (using positional operator)
    const updateResult = await TreatmentPlan.updateOne(
      {
        userId,
        currentDay: dayNum,
        "days.day": dayNum,
        "days.feedback": null
      },
      {
        $set: {
          "days.$.morning.completed": true,
          "days.$.afternoon.completed": true,
          "days.$.evening.completed": true,
          "days.$.feedback": feedback,
          "days.$.notes": notes || "",
          "days.$.review": `Day ${dayNum} feedback: ${feedback}. Notes: ${notes || "None"}`,
          currentDay: nextDayNum
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(409).json({
        message: "Day already reviewed or plan modified. Refresh and try again."
      });
    }

    // 2️⃣ Push next day plan (separate operation - no transaction needed)
    await TreatmentPlan.updateOne(
      { userId },
      {
        $push: {
          days: {
            day: nextDayNum,
            morning: { treatment: aiPlan.morning, completed: false },
            afternoon: { treatment: aiPlan.afternoon, completed: false },
            evening: { treatment: aiPlan.evening, completed: false },
            motivation: aiPlan.motivation,
            adjustment_reason: aiPlan.adjustment_reason
          }
        }
      }
    );

    return res.status(200).json({
      message: `Day ${dayNum} reviewed. Day ${nextDayNum} plan generated.`,
      day: nextDayNum,
      plan: {
        morning: aiPlan.morning,
        afternoon: aiPlan.afternoon,
        evening: aiPlan.evening,
        motivation: aiPlan.motivation,
        adjustment_reason: aiPlan.adjustment_reason
      }
    });

  } catch (err) {
    console.error("Submit Review Error:", {
      message: err.message,
      code: err.code,
      userId: req.user?.userId,
      stack: err.stack
    });
    return res.status(500).json({ 
      message: "Failed to submit review",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};

export const getTreatmentStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const plan = await TreatmentPlan.findOne({ userId });
    if (!plan) {
      return res.status(404).json({ message: "No treatment plan found" });
    }

    return res.status(200).json({
      userId: plan.userId,
      overallSeverity: plan.overallSeverity,
      currentDay: plan.currentDay,
      questionnaire_completed: plan.questionnaire_completed,
      acne_analysis_completed: plan.acne_analysis_completed,
      totalDaysCompleted: plan.days.filter(d => d.feedback !== null).length,
      days: plan.days
    });

  } catch (err) {
    console.error("Status Error:", err);
    return res.status(500).json({ message: "Failed to fetch treatment status" });
  }
};