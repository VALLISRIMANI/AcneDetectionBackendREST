export const extractAndParseJSON = (rawText) => {
  if (!rawText) throw new Error("Empty AI response");

  // Remove markdown code blocks
  let cleaned = rawText.replace(/```json/gi, "")
                       .replace(/```/g, "")
                       .trim();

  // Try to extract JSON object if extra text exists
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in AI response");
  }

  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Invalid JSON returned by AI");
  }
};
