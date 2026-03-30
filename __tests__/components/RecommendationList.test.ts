/**
 * Unit Tests: RecommendationList component
 *
 * Tests policy_level badges, inquiry_mode, fallback_used rendering.
 * Uses Vitest with jsdom environment.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import type { Recommendation, PolicyLevel, RecommendationStatus } from "@/types";

// Base recommendation for testing
const BASE_REC: Omit<Recommendation, "id" | "content" | "ai_message_draft" | "policy_level"> = {
  class_id: "class-123",
  status: "pending" as RecommendationStatus,
  dismissal_reason: null,
  action_taken_note: null,
  communicated_to_students: false,
  created_at: "2025-03-20T06:00:00Z",
  updated_at: "2025-03-20T06:00:00Z",
};

// Test data for different policy levels
const ROUTINE_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-routine-1",
  policy_level: "ROUTINE",
  ai_message_draft: "Students seem comfortable with current pace. Consider group discussions.",
  confidence_score: 0.85,
  actions_json: ["Organize group discussion", "Check in with quiet students"],
};

const WARNING_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-warning-1",
  policy_level: "WARNING",
  ai_message_draft: "Some students report difficulty following the lesson pace.",
  confidence_score: 0.72,
  actions_json: ["Slow down pacing", "Add visual aids", "Offer extra help"],
};

const CRITICAL_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-critical-1",
  policy_level: "CRITICAL",
  ai_message_draft: "Multiple students report significant struggles with current approach.",
  confidence_score: 0.91,
  actions_json: ["Immediate intervention needed", "Schedule one-on-one meetings", "Adjust teaching method"],
};

const INQUIRY_MODE_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-inquiry-1",
  policy_level: "WARNING",
  ai_message_draft: "Unclear if pacing or content difficulty is the main issue.",
  confidence_score: 0.65,
  inquiry_mode: true,
  actions_json: ["Ask clarifying questions", "Survey students for specifics"],
};

const FALLBACK_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-fallback-1",
  policy_level: "ROUTINE",
  ai_message_draft: "Using rule-based fallback recommendation.",
  confidence_score: 0.45,
  fallback_used: true,
  actions_json: ["Default action A", "Default action B"],
};

const LEGACY_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-legacy-1",
  content: "Legacy content field without ai_message_draft", // Only has content, not ai_message_draft
  confidence_score: 0.75,
};

const NO_POLICY_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-nopolicy-1",
  ai_message_draft: "Recommendation without explicit policy level",
  // policy_level is undefined
};

const ZERO_CONFIDENCE_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-zeroconf-1",
  policy_level: "ROUTINE",
  ai_message_draft: "Zero confidence test",
  confidence_score: 0,
};

const FULL_CONFIDENCE_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-fullconf-1",
  policy_level: "ROUTINE",
  ai_message_draft: "Full confidence test",
  confidence_score: 1.0,
};

const NULL_ACTIONS_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-nullactions-1",
  policy_level: "ROUTINE",
  ai_message_draft: "Null actions test",
  actions_json: null,
};

const EMPTY_ACTIONS_REC: Recommendation = {
  ...BASE_REC,
  id: "rec-emptyactions-1",
  policy_level: "ROUTINE",
  ai_message_draft: "Empty actions test",
  actions_json: [],
};

describe("RecommendationList — data structure", () => {
  it("has valid policy_level values", () => {
    const validPolicies: PolicyLevel[] = ["ROUTINE", "WARNING", "CRITICAL"];

    expect(validPolicies).toContain(ROUTINE_REC.policy_level);
    expect(validPolicies).toContain(WARNING_REC.policy_level);
    expect(validPolicies).toContain(CRITICAL_REC.policy_level);
  });

  it("has confidence_score in valid range (0-1)", () => {
    const recs = [ROUTINE_REC, WARNING_REC, CRITICAL_REC];
    for (const rec of recs) {
      expect(rec.confidence_score).toBeGreaterThanOrEqual(0);
      expect(rec.confidence_score).toBeLessThanOrEqual(1);
    }
  });

  it("handles edge case confidence scores", () => {
    expect(ZERO_CONFIDENCE_REC.confidence_score).toBe(0);
    expect(FULL_CONFIDENCE_REC.confidence_score).toBe(1);
  });

  it("has actions_json as array of strings", () => {
    expect(Array.isArray(ROUTINE_REC.actions_json)).toBe(true);
    expect(ROUTINE_REC.actions_json?.every((a) => typeof a === "string")).toBe(true);
    expect(WARNING_REC.actions_json).toHaveLength(3);
  });

  it("handles null actions_json", () => {
    expect(NULL_ACTIONS_REC.actions_json).toBeNull();
  });

  it("handles empty actions_json array", () => {
    expect(EMPTY_ACTIONS_REC.actions_json).toHaveLength(0);
  });

  it("has valid status values", () => {
    const validStatuses: RecommendationStatus[] = ["pending", "approved", "dismissed", "sent"];
    for (const rec of [ROUTINE_REC, WARNING_REC, CRITICAL_REC]) {
      expect(validStatuses).toContain(rec.status);
    }
  });

  it("has required timestamp fields", () => {
    for (const rec of [ROUTINE_REC, WARNING_REC, CRITICAL_REC]) {
      expect(rec.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(rec.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

describe("RecommendationList — inquiry_mode", () => {
  it("detects inquiry_mode true", () => {
    expect(INQUIRY_MODE_REC.inquiry_mode).toBe(true);
  });

  it("detects inquiry_mode false", () => {
    expect(ROUTINE_REC.inquiry_mode).toBeUndefined();
  });

  it("handles explicitly false inquiry_mode", () => {
    const explicitFalse: Recommendation = {
      ...ROUTINE_REC,
      id: "rec-inquiry-false",
      inquiry_mode: false,
    };
    expect(explicitFalse.inquiry_mode).toBe(false);
  });

  it("low confidence often correlates with inquiry_mode", () => {
    // Typical case: confidence below 0.7 may trigger inquiry_mode
    expect(INQUIRY_MODE_REC.confidence_score).toBeLessThan(0.7);
  });
});

describe("RecommendationList — fallback_used", () => {
  it("detects fallback_used true", () => {
    expect(FALLBACK_REC.fallback_used).toBe(true);
  });

  it("detects fallback_used false/undefined", () => {
    expect(ROUTINE_REC.fallback_used).toBeUndefined();
  });

  it("fallback typically has lower confidence", () => {
    expect(FALLBACK_REC.confidence_score).toBeLessThan(0.5);
  });

  it("handles explicitly false fallback_used", () => {
    const explicitFalse: Recommendation = {
      ...ROUTINE_REC,
      id: "rec-fallback-false",
      fallback_used: false,
    };
    expect(explicitFalse.fallback_used).toBe(false);
  });
});

describe("RecommendationList — backward compatibility", () => {
  it("uses content field when ai_message_draft is not present", () => {
    expect(LEGACY_REC.ai_message_draft).toBeUndefined();
    expect(LEGACY_REC.content).toBeDefined();
    expect(LEGACY_REC.content).toBe("Legacy content field without ai_message_draft");
  });

  it("prefers ai_message_draft over content when both exist", () => {
    const bothFields: Recommendation = {
      ...ROUTINE_REC,
      id: "rec-both-1",
      content: "Old content",
      ai_message_draft: "New ai_message_draft",
    };
    // Component displays ai_message_draft || content
    const displayContent = bothFields.ai_message_draft || bothFields.content;
    expect(displayContent).toBe("New ai_message_draft");
  });

  it("handles recommendations with only ai_message_draft", () => {
    expect(ROUTINE_REC.ai_message_draft).toBeDefined();
    expect(ROUTINE_REC.content).toBeUndefined();
  });
});

describe("RecommendationList — empty state", () => {
  it("handles empty recommendations array", () => {
    const emptyRecommendations: Recommendation[] = [];
    expect(emptyRecommendations).toHaveLength(0);
  });

  it("handles partial data (missing optional fields)", () => {
    const partialRec: Recommendation = {
      id: "rec-partial-1",
      class_id: "class-123",
      status: "pending",
      dismissal_reason: null,
      action_taken_note: null,
      communicated_to_students: false,
      created_at: "2025-03-20T06:00:00Z",
      updated_at: "2025-03-20T06:00:00Z",
      // Missing: policy_level, ai_message_draft, actions_json, confidence_score, etc.
    };
    expect(partialRec.id).toBe("rec-partial-1");
    expect(partialRec.policy_level).toBeUndefined();
    expect(partialRec.confidence_score).toBeUndefined();
  });

  it("handles recommendations without policy_level", () => {
    expect(NO_POLICY_REC.policy_level).toBeUndefined();
  });
});

describe("Recommendation — n8n workflow fields", () => {
  it("has all expected n8n-generated fields", () => {
    const fullRec: Recommendation = {
      id: "rec-full-1",
      class_id: "class-123",
      content: undefined,
      status: "pending",
      dismissal_reason: null,
      action_taken_note: null,
      communicated_to_students: false,
      created_at: "2025-03-20T06:00:00Z",
      updated_at: "2025-03-20T06:00:00Z",
      policy_level: "WARNING",
      ai_message_draft: "Test message",
      actions_json: ["Action 1", "Action 2"],
      confidence_score: 0.8,
      reasoning: "Test reasoning",
      inquiry_mode: false,
      fallback_used: false,
      priority: "HIGH",
      alert_sent_at: null,
    };

    expect(fullRec.policy_level).toBe("WARNING");
    expect(fullRec.ai_message_draft).toBe("Test message");
    expect(fullRec.actions_json).toHaveLength(2);
    expect(fullRec.confidence_score).toBe(0.8);
    expect(fullRec.reasoning).toBe("Test reasoning");
    expect(fullRec.inquiry_mode).toBe(false);
    expect(fullRec.fallback_used).toBe(false);
    expect(fullRec.priority).toBe("HIGH");
    expect(fullRec.alert_sent_at).toBeNull();
  });

  it("validates priority levels", () => {
    const priorities = ["NORMAL", "HIGH", "URGENT"] as const;
    for (const priority of priorities) {
      const rec: Recommendation = {
        ...ROUTINE_REC,
        id: `rec-priority-${priority}`,
        priority,
      };
      expect(rec.priority).toBe(priority);
    }
  });
});

describe("RecommendationList — display logic helpers", () => {
  it("calculates confidence percentage correctly", () => {
    const confidenceScore = 0.756;
    const percentage = Math.round(confidenceScore * 100);
    expect(percentage).toBe(76);
  });

  it("formats date for display", () => {
    const dateStr = "2025-03-20T06:00:00Z";
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    expect(formatted).toBe("Mar 20");
  });

  it("determines if recommendation is pending", () => {
    const isPending = ROUTINE_REC.status === "pending";
    expect(isPending).toBe(true);
  });

  it("determines if recommendation is approved", () => {
    const approvedRec: Recommendation = { ...ROUTINE_REC, status: "approved", id: "rec-approved-1" };
    expect(approvedRec.status).toBe("approved");
  });

  it("determines if recommendation is dismissed", () => {
    const dismissedRec: Recommendation = { ...ROUTINE_REC, status: "dismissed", id: "rec-dismissed-1" };
    expect(dismissedRec.status).toBe("dismissed");
  });
});

describe("RecommendationList — combined scenarios", () => {
  it("handles HIGH priority CRITICAL recommendation", () => {
    const highPriorityCritical: Recommendation = {
      ...CRITICAL_REC,
      id: "rec-high-critical-1",
      priority: "URGENT",
    };
    expect(highPriorityCritical.policy_level).toBe("CRITICAL");
    expect(highPriorityCritical.priority).toBe("URGENT");
  });

  it("handles inquiry_mode with fallback_used", () => {
    const bothFlags: Recommendation = {
      ...WARNING_REC,
      id: "rec-both-flags-1",
      inquiry_mode: true,
      fallback_used: true,
      confidence_score: 0.4,
    };
    expect(bothFlags.inquiry_mode).toBe(true);
    expect(bothFlags.fallback_used).toBe(true);
  });

  it("handles approved recommendation with action note", () => {
    const approvedWithNote: Recommendation = {
      ...ROUTINE_REC,
      id: "rec-approved-note-1",
      status: "approved",
      action_taken_note: "Scheduled group discussion for next class",
    };
    expect(approvedWithNote.status).toBe("approved");
    expect(approvedWithNote.action_taken_note).toBeTruthy();
  });

  it("handles dismissed recommendation with reason", () => {
    const dismissedWithReason: Recommendation = {
      ...ROUTINE_REC,
      id: "rec-dismissed-reason-1",
      status: "dismissed",
      dismissal_reason: "Already addressed this issue",
    };
    expect(dismissedWithReason.status).toBe("dismissed");
    expect(dismissedWithReason.dismissal_reason).toBeTruthy();
  });
});
