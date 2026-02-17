export const aggregateSessionSeverity = (predictions) => {
  if (!predictions.length) {
    throw new Error("No predictions found for session");
  }

  let highest = predictions[0];
  let totalScore = 0;

  for (let pred of predictions) {
    totalScore += pred.severityScore;

    if (pred.severityScore > highest.severityScore) {
      highest = pred;
    }
  }

  const averageScore = totalScore / predictions.length;

  let finalSeverity;

  if (highest.severityScore >= 4) {
    finalSeverity = "severe";
  } else if (highest.severityScore >= 3) {
    finalSeverity = "moderate-severe";
  } else if (highest.severityScore >= 2) {
    finalSeverity = "moderate";
  } else if (highest.severityScore >= 1) {
    finalSeverity = "mild";
  } else {
    finalSeverity = "cleanskin";
  }

  return {
    finalSeverity,
    highestScore: highest.severityScore,
    dominantArea: highest.faceArea,
    aggregationReason: "highest_area_dominates",
    averageScore
  };
};
