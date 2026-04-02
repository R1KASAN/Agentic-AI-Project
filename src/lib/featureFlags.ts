// Spec 6: feature flags keep the decision workspace rollout safe and reversible.
export type FeatureFlagName =
  | "enable_decision_workspace"
  | "enable_structured_recommendation_payload";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function readFlag(name: FeatureFlagName) {
  const envName = name.toUpperCase();
  const rawValue =
    process.env[name] ??
    process.env[envName] ??
    process.env[`NEXT_PUBLIC_${envName}`] ??
    "";

  return TRUE_VALUES.has(rawValue.trim().toLowerCase());
}

export function getFeatureFlags() {
  return {
    enableDecisionWorkspace: readFlag("enable_decision_workspace"),
    enableStructuredRecommendationPayload: readFlag(
      "enable_structured_recommendation_payload",
    ),
  };
}
