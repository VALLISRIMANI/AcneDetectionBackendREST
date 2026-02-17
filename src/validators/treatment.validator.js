/**
 * Treatment Plan Validator
 * Validates AI-generated treatment plan structure and content
 * 
 * Enforces:
 * - Exactly 15 days
 * - Sequential day numbers 1-15
 * - Required fields in each day
 * - Non-empty string values
 */

const REQUIRED_FIELDS = {
  dayNumber: "number",
  morning: "string",
  afternoon: "string",
  evening: "string",
  lifestyleTips: "string"
};

const EXPECTED_DAYS = 15;

/**
 * Validate treatment plan structure
 * 
 * @param {Object} plan - Parsed treatment plan object
 * @throws {Error} If validation fails
 */
export const validateTreatmentPlan = (plan) => {
  // Check if plan exists and is object
  if (!plan || typeof plan !== "object") {
    throw new Error("Treatment plan must be a JSON object");
  }

  // Check if 'days' array exists
  if (!Array.isArray(plan.days)) {
    throw new Error("Treatment plan must have 'days' array");
  }

  // Check exact number of days
  if (plan.days.length !== EXPECTED_DAYS) {
    throw new Error(
      `Treatment plan must have exactly ${EXPECTED_DAYS} days, got ${plan.days.length}`
    );
  }

  // Validate each day
  plan.days.forEach((day, index) => {
    validateDay(day, index + 1);
  });

  return true;
};

/**
 * Validate individual day entry
 * 
 * @param {Object} day - Day entry object
 * @param {number} expectedDayNumber - Expected day number (1-15)
 * @throws {Error} If day validation fails
 */
const validateDay = (day, expectedDayNumber) => {
  // day must be object
  if (!day || typeof day !== "object") {
    throw new Error(`Day ${expectedDayNumber} must be an object`);
  }

  // Validate day number
  if (!Number.isInteger(day.dayNumber)) {
    throw new Error(
      `Day ${expectedDayNumber} must have dayNumber as integer`
    );
  }

  if (day.dayNumber !== expectedDayNumber) {
    throw new Error(
      `Day numbers must be sequential. Expected ${expectedDayNumber} at index ${expectedDayNumber - 1}, got ${day.dayNumber}`
    );
  }

  // Validate required fields
  for (const [field, type] of Object.entries(REQUIRED_FIELDS)) {
    if (!(field in day)) {
      throw new Error(`Day ${expectedDayNumber} missing required field: ${field}`);
    }

    if (typeof day[field] !== type) {
      throw new Error(
        `Day ${expectedDayNumber}.${field} must be ${type}, got ${typeof day[field]}`
      );
    }

    // Check non-empty strings
    if (type === "string" && !day[field].trim()) {
      throw new Error(`Day ${expectedDayNumber}.${field} cannot be empty`);
    }
  }
};

/**
 * Check if treatment plan is valid without throwing
 * 
 * @param {Object} plan - Treatment plan to validate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const isValidTreatmentPlan = (plan) => {
  try {
    validateTreatmentPlan(plan);
    return { isValid: true, error: null };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
};

export default validateTreatmentPlan;
