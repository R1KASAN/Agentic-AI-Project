"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Clock,
  HelpCircle,
  Loader2,
  Pencil,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type {
  RecommendationConfidenceLabel,
  RecommendationViewModel,
} from "@/types";

interface RecommendationListProps {
  recommendations: RecommendationViewModel[];
  onApprove?: (id: string, note: string, editedDraft: string) => Promise<void>;
  onDismiss?: (id: string, reason: string) => Promise<void>;
  emptyStateTitle?: string;
  emptyStateBody?: string;
}

const STATUS_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "success" | "warning" }
> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  dismissed: { label: "Dismissed", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
};

const POLICY_BADGES: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "success" | "warning" | "destructive";
    className: string;
  }
> = {
  ROUTINE: {
    label: "Routine",
    variant: "default",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  WARNING: {
    label: "Warning",
    variant: "warning",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CRITICAL: {
    label: "Critical",
    variant: "destructive",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

const RATIONALE_LABELS: Record<string, string> = {
  trend_shift: "แนวโน้มเปลี่ยน",
  low_mood: "บรรยากาศอ่อนลง",
  pace_friction: "จังหวะการเรียนตึง",
  fairness_signal: "สัญญาณเรื่องความเป็นธรรม",
  mixed_signal: "หลายสัญญาณร่วมกัน",
  unknown: "สัญญาณรวมของห้อง",
};

const MAX_QUICK_ACTION_LENGTH = 48;
const MAX_QUICK_ACTIONS = 4;
const INITIAL_VISIBLE_QUICK_ACTIONS = 2;

function normalizeQuickActionLabel(action: string): string | null {
  const normalized = action
    .trim()
    .replace(/^[\s"'`“”]+|[\s"'`“”]+$/g, "")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

function isUsableQuickAction(action: string): boolean {
  if (
    action.length === 0 ||
    action.length > MAX_QUICK_ACTION_LENGTH ||
    action.includes("\n") ||
    action.includes(":")
  ) {
    return false;
  }

  const lowered = action.toLowerCase();
  const blockedTerms = ["เพราะ", "เนื่องจาก", "สัญญาณ", "ระบบ", "draft"];

  return !blockedTerms.some((term) => lowered.includes(term));
}

function getFallbackQuickActions(): string[] {
  return [
    "จะเช็กความเข้าใจอีกครั้ง",
    "จะอธิบายประเด็นนี้ให้ช้าลง",
    "จะเปิดช่วงถาม-ตอบเพิ่ม",
    "จะติดตามอีกครั้งในคาบหน้า",
  ];
}

function getInquiryQuickActions(): string[] {
  return [
    "จะสังเกตเพิ่มเติมว่าปัญหานี้เกิดช่วงไหนของคาบ",
    "จะชวนห้องสะท้อนว่าอะไรยังไม่ชัด",
    "จะลองถามเพิ่มว่ามีจุดไหนที่ทำให้รู้สึกไม่ยุติธรรม",
  ];
}

function getQuickActions(recommendation: RecommendationViewModel): string[] {
  if (recommendation.inquiryMode) {
    return getInquiryQuickActions().slice(0, MAX_QUICK_ACTIONS);
  }

  const filteredActions = recommendation.actions
    .map(normalizeQuickActionLabel)
    .filter((action): action is string => action !== null)
    .filter(isUsableQuickAction);

  const uniqueActions = [...new Set(filteredActions)];

  if (uniqueActions.length > 0) {
    return uniqueActions.slice(0, MAX_QUICK_ACTIONS);
  }

  return getFallbackQuickActions().slice(0, MAX_QUICK_ACTIONS);
}

export function RecommendationList({
  recommendations,
  onApprove,
  onDismiss,
  emptyStateTitle = "No response history yet.",
  emptyStateBody = "Recommendations and teacher decisions will appear here once the class has enough signal.",
}: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center space-y-2 py-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">{emptyStateTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground">{emptyStateBody}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          onApprove={onApprove}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onApprove,
  onDismiss,
}: {
  recommendation: RecommendationViewModel;
  onApprove?: (id: string, note: string, editedDraft: string) => Promise<void>;
  onDismiss?: (id: string, reason: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null);
  const [showAllQuickActions, setShowAllQuickActions] = useState(false);
  const initialDraft = recommendation.aiMessageDraft ?? "";
  const [editableDraft, setEditableDraft] = useState(initialDraft);
  const [draftEditorValue, setDraftEditorValue] = useState(initialDraft);
  const [showInput, setShowInput] = useState<"edit" | "approve" | "dismiss" | null>(null);

  const status = STATUS_BADGES[recommendation.status] || STATUS_BADGES.pending;
  const policy = recommendation.policyLevel
    ? POLICY_BADGES[recommendation.policyLevel]
    : null;
  const isPending = recommendation.status === "pending";
  const isInquiryCard = recommendation.inquiryMode;
  const isDraftEmpty = editableDraft.trim().length === 0;
  const cannotApprove = isInquiryCard && draftNote.trim().length === 0;
  const confidenceTone = getConfidenceTone(recommendation.confidenceLabel);
  const quickActions = getQuickActions(recommendation);
  const visibleQuickActions = showAllQuickActions
    ? quickActions
    : quickActions.slice(0, INITIAL_VISIBLE_QUICK_ACTIONS);
  const hasMoreQuickActions = quickActions.length > INITIAL_VISIBLE_QUICK_ACTIONS;

  async function handleApprove() {
    setLoading(true);
    await (onApprove ?? (async () => {}))(
      recommendation.id,
      draftNote,
      editableDraft.trim()
    );
    setLoading(false);
    setShowInput(null);
  }

  async function handleDismiss() {
    setLoading(true);
    await (onDismiss ?? (async () => {}))(recommendation.id, draftNote);
    setLoading(false);
    setShowInput(null);
  }

  function handleOpenEdit() {
    setDraftEditorValue(editableDraft);
    setShowInput("edit");
  }

  function handleOpenApprove() {
    setShowAllQuickActions(false);
    setShowInput("approve");
  }

  function handleSaveDraft() {
    setEditableDraft(draftEditorValue.trim());
    setShowInput(null);
  }

  function handleCancelEdit() {
    setEditableDraft(initialDraft);
    setDraftEditorValue(initialDraft);
    setShowInput(null);
  }

  function handleQuickActionSelect(action: string) {
    setDraftNote(action);
    setSelectedQuickAction(action);
  }

  function handleQuickActionClear() {
    setDraftNote("");
    setSelectedQuickAction(null);
  }

  return (
    <Card
      className={
        isInquiryCard
          ? "overflow-hidden border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-slate-50 dark:border-violet-900 dark:from-violet-950/30 dark:via-slate-950 dark:to-slate-950"
          : "overflow-hidden"
      }
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={
                isInquiryCard
                  ? "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                  : "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30"
              }
            >
              {isInquiryCard ? (
                <HelpCircle className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant} className="text-[10px]">
                  {status.label}
                </Badge>
                {policy && (
                  <Badge
                    variant={policy.variant}
                    className={`text-[10px] ${policy.className}`}
                  >
                    {policy.label}
                  </Badge>
                )}
                {isInquiryCard && (
                  <Badge
                    variant="secondary"
                    className="border-violet-200 bg-violet-50 text-[10px] text-violet-700"
                  >
                    <HelpCircle className="mr-1 h-3 w-3" />
                    Inquiry Mode
                  </Badge>
                )}
                {recommendation.fallbackUsed && (
                  <Badge
                    variant="secondary"
                    className="border-slate-200 bg-slate-100 text-[10px] text-slate-600"
                  >
                    <Wand2 className="mr-1 h-3 w-3" />
                    Safety fallback
                  </Badge>
                )}
                {recommendation.confidenceLabel && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${confidenceTone.className}`}
                  >
                    {confidenceTone.label}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {RATIONALE_LABELS[recommendation.rationaleTag]}
                </Badge>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(recommendation.createdAt).toLocaleDateString("th-TH", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <p className="text-sm font-medium leading-relaxed text-foreground">
                {editableDraft || "ยังไม่มี draft message"}
              </p>
            </div>
          </div>
        </div>

        {isInquiryCard && (
          <div className="rounded-xl border border-violet-200/80 bg-violet-50/70 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-100">
            ระบบกำลังใช้ Inquiry Mode เพราะสัญญาณจากการตอบสนองก่อนหน้าบอกว่าควรชวนครูสะท้อนบริบทเพิ่มเติม แทนการเร่งเสนอทางแก้
          </div>
        )}

        {recommendation.reasoningSummary && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              เหตุผลที่ระบบเสนอ draft นี้
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {recommendation.reasoningSummary}
            </p>
          </div>
        )}

        {recommendation.actions.length > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Suggested Actions
            </p>
            <ul className="mt-2 space-y-2 text-sm text-foreground">
              {recommendation.actions.map((action, index) => (
                <li key={`${recommendation.id}-${index}`} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.fallbackUsed && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900/40">
            draft นี้มาจาก safety fallback แบบ rules-assisted เพื่อคงคุณภาพขั้นต่ำของข้อเสนอ แม้ความมั่นใจของโมเดลจะยังไม่สูงมาก
          </div>
        )}

        {recommendation.teacherActionNote && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-muted-foreground dark:bg-slate-800/50">
            <span className="font-medium">บันทึกการตอบสนองของครู:</span>{" "}
            {recommendation.teacherActionNote}
          </div>
        )}

        {recommendation.dismissalReason && !isPending && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
            <span className="font-medium">เหตุผลที่ปฏิเสธ:</span>{" "}
            {recommendation.dismissalReason}
          </div>
        )}

        {showInput && isPending && (
          <div className="space-y-2">
            {showInput === "edit" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                  ข้อความที่จะสื่อสารกับนักเรียน
                </div>
                <Textarea
                  value={draftEditorValue}
                  onChange={(event) => setDraftEditorValue(event.target.value)}
                  placeholder="ปรับข้อความที่ต้องการสื่อสารกับนักเรียนก่อนอนุมัติ…"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  กด Save เพื่ออัปเดตข้อความที่จะสื่อสารบนการ์ดนี้ก่อนค่อยไปขั้นอนุมัติ
                </p>
              </div>
            )}
            {showInput !== "edit" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {showInput === "approve" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {isInquiryCard
                        ? "บริบทเพิ่มเติมจากครู"
                        : "บันทึกการตอบสนองของครู"}
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5" />
                      เหตุผลที่ปฏิเสธ
                    </>
                  )}
                </div>
                {showInput === "approve" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {isInquiryCard
                        ? "ระบบจะใช้บริบทนี้ช่วยตีความสัญญาณของห้อง"
                        : "เลือกตัวอย่างแล้วปรับเพิ่มได้"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visibleQuickActions.map((action) => {
                        const isSelected = selectedQuickAction === action;

                        return (
                          <Button
                            key={`${recommendation.id}-${action}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickActionSelect(action)}
                            className={
                              isSelected
                                ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-50 hover:text-sky-700"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-700"
                            }
                            aria-pressed={isSelected}
                          >
                            {action}
                          </Button>
                        );
                      })}
                    </div>
                    {(hasMoreQuickActions && !showAllQuickActions) || selectedQuickAction ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {hasMoreQuickActions && !showAllQuickActions && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllQuickActions(true)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            ดูเพิ่ม
                          </Button>
                        )}
                        {selectedQuickAction && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleQuickActionClear}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            ล้างตัวอย่าง
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
                <Textarea
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  placeholder={
                    showInput === "approve"
                      ? isInquiryCard
                        ? "ระบุบริบทเพิ่มเติมที่อยากให้ระบบรับรู้ก่อนอนุมัติ…"
                        : "ระบุว่าคุณจะตอบสนองต่อเรื่องนี้อย่างไร…"
                      : "ระบุเหตุผลที่ปฏิเสธ draft นี้…"
                  }
                  rows={3}
                />
              </div>
            )}
            {(showInput === "approve" || showInput === "edit") && isDraftEmpty && (
              <p className="text-xs text-rose-600">
                Draft response ต้องไม่ว่างก่อนกดอนุมัติ
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={
                  showInput === "edit"
                    ? handleSaveDraft
                    : showInput === "approve"
                      ? handleApprove
                      : handleDismiss
                }
                disabled={
                  loading ||
                  ((showInput === "approve" || showInput === "edit") && isDraftEmpty) ||
                  (showInput === "approve" && cannotApprove)
                }
                className={
                  showInput === "approve"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : showInput === "edit"
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-slate-600 text-white hover:bg-slate-700"
                }
              >
                {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {showInput === "edit"
                  ? "Save"
                  : showInput === "approve"
                    ? "ยืนยันการอนุมัติ"
                    : "ยืนยันการปฏิเสธ"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (showInput === "edit") {
                    handleCancelEdit();
                    return;
                  }
                  setShowInput(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isPending && !showInput && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              onClick={handleOpenEdit}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              แก้ข้อความที่จะสื่อสาร
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-green-200 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
              onClick={handleOpenApprove}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              {isInquiryCard ? "ส่งต่อพร้อมบริบท" : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-200 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setShowInput("dismiss")}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getConfidenceTone(label: RecommendationConfidenceLabel) {
  if (label === "สูง") {
    return {
      label: "ความมั่นใจสูง",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (label === "กลาง") {
    return {
      label: "ความมั่นใจกลาง",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "ใช้ด้วยความระวัง",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
}
