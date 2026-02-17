import axios from "axios";
import { extractAndParseJSON } from "../utils/cleanJson.js";
import { validateTreatmentPlan } from "../validators/treatment.validator.js";

/**
 * Generate treatment plan from Groq API with single retry mechanism
 * 
 * @param {string} prompt - The treatment plan prompt
 * @returns {Object} Validated and parsed treatment plan JSON
 * @throws {Error} If validation fails after retry
 */
export const generateTreatmentFromGrok = async (prompt) => {
  const maxRetries = 1;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are a strict medical skincare AI. Return ONLY valid JSON with no markdown, no explanations. Pure JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for deterministic output
          max_tokens: 3000
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      // Extract message content
      const messageContent = response.data.choices[0].message.content;

      // Clean and parse JSON (removes markdown wrappers)
      let parsedPlan = extractAndParseJSON(messageContent);

      // Validate structure and content
      validateTreatmentPlan(parsedPlan);

      // If we reach here, validation passed
      return parsedPlan;

    } catch (error) {
      lastError = error;
      
      // On first attempt, log and retry
      if (attempt === 0) {
        console.warn(`[Groq] Attempt ${attempt + 1} failed: ${error.message}. Retrying...`);
        continue;
      }
    }
  }

  // Both attempts failed - throw structured error
  throw {
    status: 400,
    message: "Failed to generate valid treatment plan after retry",
    error: lastError.message,
    retryCount: maxRetries
  };
};

export default generateTreatmentFromGrok;
