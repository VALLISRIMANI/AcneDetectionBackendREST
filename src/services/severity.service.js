export const calculateSeverity = (mlPrediction, profile) => {
  const baseScores = {
    cleanskin: 0,
    mild: 1,
    moderate: 2,
    severe: 4,
    unknown: 0
  };

  let score = baseScores[mlPrediction] || 0;
  let reason = [];

  if (profile.acneDuration === ">3yrs") {
    score += 1;
    reason.push("long_duration");
  }

  if (profile.stressLevel === "High") {
    score += 0.5;
    reason.push("high_stress");
  }

  if (profile.skinType === "Oily") {
    score += 0.5;
    reason.push("oily_skin");
  }

  if (profile.sleepHours === "<5") {
    score += 0.5;
    reason.push("low_sleep");
  }

  let finalSeverity = "cleanskin";

  if (score >= 4) finalSeverity = "severe";
  else if (score >= 2) finalSeverity = "moderate";
  else if (score >= 1) finalSeverity = "mild";

  return { score, finalSeverity, reason: reason.join(", ") };
};
// severity.service.js
