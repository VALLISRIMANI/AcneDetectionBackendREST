/**
 * Derives overall acne severity from per-area predictions.
 * Rules:
 *  - Any area "severe"         → "severe"
 *  - Any area "moderate"       → escalate toward "moderate" or "moderate-severe"
 *  - Majority mild             → "mild"
 *  - All cleanskin/unknown     → "cleanskin"
 */
export const deriveOverallSeverity = (areas = []) => {
  const predictions = areas.map(a => a.prediction);

  if (predictions.includes("severe")) return "severe";

  const moderateCount = predictions.filter(p => p === "moderate").length;
  const mildCount = predictions.filter(p => p === "mild").length;
  const total = predictions.length;

  // FIX: Require strict majority (> not >=) to escalate to moderate-severe
  if (moderateCount > total / 2) return "moderate-severe";
  if (moderateCount > 0) return "moderate";
  if (mildCount > 0) return "mild";

  return "cleanskin";
};