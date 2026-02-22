import axios from "axios";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const callGroq = async (systemPrompt, userPrompt) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  let response;
  try {
    response = await axios.post(
      GROQ_URL,
      {
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 1024
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );
  } catch (axiosErr) {
    const errorMsg = axiosErr.response?.data?.error?.message || axiosErr.message;
    throw new Error(`GROQ API Error: ${errorMsg}`);
  }

  const raw = response.data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from GROQ");

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`GROQ returned invalid JSON: ${cleaned.substring(0, 100)}`);
  }

  // Validate required fields
  const required = ["morning", "afternoon", "evening", "motivation", "adjustment_reason"];
  for (const field of required) {
    if (typeof parsed[field] !== "string") {
      throw new Error(`Missing or invalid field in AI response: ${field}`);
    }
  }

  return parsed;
};