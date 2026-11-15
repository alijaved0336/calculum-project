import { setConfidenceScore } from "@ada/design-system";

// Mirrors apps/ap/src/utils/FormatData.ts's toConfidenceScoreLabel. Ranges mirror the back-end
// MatchOverviewManager::calculateConfidenceScoreLabel() - used because the grid's GraphQL query
// returns the raw numeric score, not the label setConfidenceScore expects.
export const toConfidenceScoreLabel = (score: number | null | undefined): string => {
  if (score === null || score === undefined) {
    return "na";
  }
  if (score <= 20) {
    return "veryLow";
  }
  if (score <= 40) {
    return "low";
  }
  if (score <= 60) {
    return "med";
  }
  if (score <= 80) {
    return "high";
  }
  return "veryhigh";
};

export { setConfidenceScore };
