/**
 * Treatment Plan Prompt Builder
 * Generates a strict, deterministic prompt that enforces:
 * - Exactly 15 days
 * - Pure JSON output (no markdown)
 * - No explanations outside JSON
 * - Sequential day numbers 1-15
 * - Required fields for each day
 */

export const buildTreatmentPrompt = (sessionData, profileData) => {
  const {
    severity,
    dominantArea,
  } = sessionData;

  const {
    ageGroup = "Unknown",
    sex = "Unknown",
    skinType = "Unknown",
    sensitiveSkin = false,
    stressLevel = "Unknown",
    sleepHours = "Unknown",
    allergyFoods = [],
    hasMedicationAllergy = false,
    badReactionsTo = [],
    usingTreatment = false,
    stoppedDueToSideEffects = false,
  } = profileData;

  const allergies = [
    ...(allergyFoods || []),
    ...(badReactionsTo || [])
  ].join(", ") || "None";

  const treatmentHistory = usingTreatment
    ? stoppedDueToSideEffects
      ? "Previously irritated by treatments"
      : "Currently using treatment"
    : "Treatment-naive";

  return `You are a medical skincare AI system.

Generate a STRICT, VALID JSON 15-day acne treatment plan.

Return ONLY valid JSON.
Do NOT include markdown.
Do NOT include explanations outside JSON.
Do NOT wrap response in code blocks.
Do NOT include comments.

The JSON structure MUST be:

{
  "days": [
    {
      "dayNumber": 1,
      "morning": "...",
      "afternoon": "...",
      "evening": "...",
      "lifestyleTips": "..."
    }
  ]
}

You MUST generate EXACTLY 15 days.
Days MUST be sequential from 1 to 15.
Each field must contain detailed medical instructions in clear patient-friendly language.
Each day must differ meaningfully (no repetition).

-----------------------------------------------------
PATIENT CONTEXT
-----------------------------------------------------

Severity: ${severity}
Dominant Area: ${dominantArea}
Age Group: ${ageGroup}
Gender: ${sex}
Skin Type: ${skinType}
Sensitive Skin: ${sensitiveSkin}
Stress Level: ${stressLevel}
Sleep Hours: ${sleepHours}
Allergies: ${allergies}
Treatment History: ${treatmentHistory}

-----------------------------------------------------
CLINICAL STRUCTURE REQUIREMENTS
-----------------------------------------------------

You MUST divide treatment into 3 phases:

Phase 1 (Day 1–5): Stabilization Phase
- Introduce actives gradually
- Lower frequency
- Focus on barrier repair

Phase 2 (Day 6–10): Active Treatment Phase
- Increase strength or frequency if tolerated
- Target dominant area specifically
- Introduce rotation of ingredients

Phase 3 (Day 11–15): Recovery & Maintenance Phase
- Reduce irritation risk
- Stabilize improvements
- Prevent recurrence

-----------------------------------------------------
SEVERITY-BASED RULES (STRICTLY FOLLOW)
-----------------------------------------------------

MILD ACNE:

Morning:
- Gentle face wash
- Salicylic acid 0.5–2%
- Oil-free moisturizer
- Paraben-free sunscreen

Night:
- Gentle cleanser
- Adapalene 0.1% (alternate nights first week)
- If sensitive skin: replace with Azelaic acid 10–15%
- Moisturizer after 20–30 minutes

-----------------------------------------------------

MODERATE ACNE:

Morning:
- Salicylic acid face wash
- Clindamycin 1% gel (thin layer)
- Oil-free moisturizer
- Sunscreen

Night:
- Gentle cleanser
- Adapalene 0.1% OR Tretinoin 0.025%
- Moisturizer

Alternate (antibiotic-free option):
- Benzoyl peroxide 2.5% (morning)
- Adapalene (night)

-----------------------------------------------------

MODERATE–SEVERE ACNE:

Morning:
- Benzoyl peroxide 2.5%
- Clindamycin 1% (short term only)
- Paraben-free moisturizer
- Paraben-free sunscreen

Night:
- Gentle cleanser
- Adapalene 0.1% OR Tretinoin 0.025%
- Moisturizer

Oral:
- Doxycycline 50–100 mg once daily (maximum 14–15 days)

-----------------------------------------------------

SEVERE ACNE:

Morning:
- Gentle cleanser
- Benzoyl peroxide 2.5%
- Moisturizer + sunscreen

Night:
- Gentle cleanser
- Adapalene OR Azelaic acid
- Moisturizer

Oral:
- DO NOT suggest isotretinoin
- DO NOT suggest hormonal pills
- You may state: "Dermatologists may prescribe oral antibiotics under supervision."

You MUST include this statement in lifestyleTips for severe cases:
"Severe acne requires dermatologist supervision to prevent scarring."

-----------------------------------------------------
PERSONALIZATION RULES (MANDATORY)
-----------------------------------------------------

1. Age-based adaptation
2. Gender-based hormonal considerations
3. Skin-type adjustments
4. Sensitivity modifications
5. Stress & sleep adjustments
6. Dominant area targeting
7. Ingredient rotation across days
8. Progressive intensity increase
9. No repetitive daily routine

-----------------------------------------------------
FINAL REQUIREMENTS
-----------------------------------------------------

- EXACTLY 15 days
- Progressive intensity
- Ingredient rotation
- Personalized adjustments
- Valid JSON only
`;
};

export default buildTreatmentPrompt;
