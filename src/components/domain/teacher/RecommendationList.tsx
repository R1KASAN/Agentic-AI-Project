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
  History,
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
  onApprove?: (
    id: string,
    note: string,
    editedDraft: string,
    shareWithStudents: boolean,
  ) => Promise<void>;
  onDismiss?: (id: string, reason: string) => Promise<void>;
  onImplemented?: (
    id: string,
    closureShareNote: string,
    shareWithStudents: boolean,
  ) => Promise<void>;
  onFeedback?: (id: string, feedback: string) => Promise<void>;
  onNotActioned?: (id: string, reason: string) => Promise<void>;
  onRestore?: (id: string) => Promise<void>;
  enableDecisionWorkspace?: boolean;
  enableStructuredRecommendationPayload?: boolean;
  historyMode?: boolean;
  emptyStateTitle?: string;
  emptyStateBody?: string;
}

const STATUS_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "success" | "warning" }
> = {
  pending: { label: "รออนุมัติ", variant: "warning" },
  approved: { label: "อนุมัติแล้ว", variant: "success" },
  implemented: { label: "ลองใช้แล้ว", variant: "success" },
  feedback_logged: { label: "สะท้อนผลแล้ว", variant: "default" },
  dismissed: { label: "ข้ามแล้ว", variant: "secondary" },
  not_actioned: { label: "ยังไม่ใช้ตอนนั้น", variant: "secondary" },
  sent: { label: "ส่งแล้ว", variant: "default" },
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
    label: "ปกติ",
    variant: "default",
    className: "bg-blue-500/10 text-blue-200 border-blue-300/40",
  },
  WARNING: {
    label: "ต้องติดตาม",
    variant: "warning",
    className: "bg-amber-500/10 text-amber-200 border-amber-300/40",
  },
  CRITICAL: {
    label: "เสี่ยงสูง",
    variant: "destructive",
    className: "bg-red-500/10 text-red-200 border-red-300/40",
  },
};

const RATIONALE_LABELS: Record<string, string> = {
  trend_shift: "แนวโน้มเปลี่ยนชัด",
  low_mood: "อารมณ์ห้องอ่อนลง",
  pace_friction: "จังหวะคาบตึง",
  fairness_signal: "ควรเช็กความรู้สึกเรื่องความเป็นธรรม",
  mixed_signal: "หลายสัญญาณร่วมกัน",
  unknown: "ภาพรวมของห้อง",
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
  const blockedTerms = [
    "เพราะ",
    "เนื่องจาก",
    "สัญญาณ",
    "ระบบ",
    "draft",
    "ฉบับร่าง",
  ];

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
  onImplemented,
  onFeedback,
  onNotActioned,
  onRestore,
  enableDecisionWorkspace = false,
  enableStructuredRecommendationPayload = false,
  historyMode = false,
  emptyStateTitle = "ยังไม่มีประวัติข้อความรออนุมัติ",
  emptyStateBody = "ฉบับร่างและการตัดสินของครูจะแสดงที่นี่เมื่อห้องมีสัญญาณเพียงพอ",
}: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <Card className="product-section-card overflow-hidden border-dashed">
        <CardContent className="flex flex-col items-center justify-center space-y-3 py-10 text-center">
          <Sparkles className="h-8 w-8 text-[var(--teacher-dashboard-primary)]" />
          <p className="text-sm font-medium text-[var(--teacher-dashboard-text)]">
            {emptyStateTitle}
          </p>
          <p className="max-w-md text-sm text-[var(--teacher-dashboard-text-muted)]">
            {emptyStateBody}
          </p>
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
          onImplemented={onImplemented}
          onFeedback={onFeedback}
          onNotActioned={onNotActioned}
          onRestore={onRestore}
          enableDecisionWorkspace={enableDecisionWorkspace}
          enableStructuredRecommendationPayload={
            enableStructuredRecommendationPayload
          }
          historyMode={historyMode}
        />
      ))}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onApprove,
  onDismiss,
  onImplemented,
  onFeedback,
  onNotActioned,
  onRestore,
  enableDecisionWorkspace,
  enableStructuredRecommendationPayload,
  historyMode = false,
}: {
  recommendation: RecommendationViewModel;
  onApprove?: (
    id: string,
    note: string,
    editedDraft: string,
    shareWithStudents: boolean,
  ) => Promise<void>;
  onDismiss?: (id: string, reason: string) => Promise<void>;
  onImplemented?: (
    id: string,
    closureShareNote: string,
    shareWithStudents: boolean,
  ) => Promise<void>;
  onFeedback?: (id: string, feedback: string) => Promise<void>;
  onNotActioned?: (id: string, reason: string) => Promise<void>;
  onRestore?: (id: string) => Promise<void>;
  enableDecisionWorkspace?: boolean;
  enableStructuredRecommendationPayload?: boolean;
  historyMode?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(
    null,
  );
  const [showAllQuickActions, setShowAllQuickActions] = useState(false);
  const initialDraft =
    recommendation.studentFacingDraft ?? recommendation.aiMessageDraft ?? "";
  const [editableDraft, setEditableDraft] = useState(initialDraft);
  const [draftEditorValue, setDraftEditorValue] = useState(initialDraft);
  const [showInput, setShowInput] = useState<
    "edit" | "approve" | "dismiss" | "implemented" | "feedback" | "not_actioned" | null
  >(null);
  const structuredPayload =
    enableStructuredRecommendationPayload && recommendation.structuredPayload
      ? recommendation.structuredPayload
      : null;
  const isDecisionWorkspace =
    enableDecisionWorkspace && structuredPayload !== null;

  const statusKey =
    recommendation.historyDisplayStatus ??
    recommendation.actionStatus ??
    recommendation.status;
  const status = STATUS_BADGES[statusKey ?? recommendation.status] || STATUS_BADGES.pending;
  const policy = recommendation.policyLevel
    ? POLICY_BADGES[recommendation.policyLevel]
    : null;
  const isPending = !historyMode && recommendation.isActionableDraft;
  const isInquiryCard = recommendation.inquiryMode;
  const isDraftEmpty = editableDraft.trim().length === 0;
  const shareWithStudents = !isInquiryCard;
  const confidenceTone = getConfidenceTone(recommendation.confidenceLabel);
  const quickActions = getQuickActions(recommendation);
  const visibleQuickActions = showAllQuickActions
    ? quickActions
    : quickActions.slice(0, INITIAL_VISIBLE_QUICK_ACTIONS);
  const hasMoreQuickActions =
    quickActions.length > INITIAL_VISIBLE_QUICK_ACTIONS;

  const timelineSteps = [
    { key: "pending", label: "รอตรวจ" },
    { key: "approved", label: "ใช้ข้อความนี้" },
    { key: "implemented", label: "ลองใช้แล้ว" },
    { key: "feedback_logged", label: "สะท้อนผลแล้ว" },
  ] as const;
  const currentTimelineIndex = Math.max(
    0,
    timelineSteps.findIndex((step) => step.key === statusKey),
  );

  async function handleApprove(noteOverride?: string) {
    setLoading(true);
    await (onApprove ?? (async () => {}))(
      recommendation.id,
      noteOverride ?? draftNote,
      editableDraft.trim(),
      shareWithStudents,
    );
    setLoading(false);
    setShowInput(null);
  }

  async function handleImplemented() {
    setLoading(true);
    await (onImplemented ?? (async () => {}))(
      recommendation.id,
      draftNote,
      draftNote.trim().length > 0,
    );
    setLoading(false);
    setShowInput(null);
  }

  async function handleFeedbackSubmit() {
    setLoading(true);
    await (onFeedback ?? (async () => {}))(recommendation.id, feedbackNote);
    setLoading(false);
    setShowInput(null);
  }

  async function handleNotActioned() {
    setLoading(true);
    await (onNotActioned ?? (async () => {}))(recommendation.id, draftNote);
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
          ? "product-section-card overflow-hidden border-[rgba(167,139,250,0.28)]"
          : "product-section-card overflow-hidden"
      }
    >
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={
                isInquiryCard
                  ? "mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200"
                  : "mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-200"
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
                    className="border-violet-200 bg-violet-500/10 text-[10px] text-violet-200"
                  >
                    <HelpCircle className="mr-1 h-3 w-3" />
                    ต้องเติมบริบทก่อน
                  </Badge>
                )}
                {recommendation.fallbackUsed && (
                  <Badge
                    variant="secondary"
                    className="border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[10px] text-[var(--teacher-dashboard-text-muted)]"
                  >
                    <Wand2 className="mr-1 h-3 w-3" />
                    สรุปจากบริบทรวมล่าสุด
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
                <Badge
                  variant="outline"
                  className="text-[10px] text-[var(--teacher-dashboard-text-muted)]"
                >
                  {RATIONALE_LABELS[recommendation.rationaleTag]}
                </Badge>
                <span className="flex items-center gap-1 text-[10px] text-[var(--teacher-dashboard-text-muted)]">
                  <Clock className="h-3 w-3" />
                  {new Date(recommendation.createdAt).toLocaleDateString(
                    "th-TH",
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </span>
              </div>

              {isDecisionWorkspace ? (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    {timelineSteps.map((step, index) => {
                      const isDone = index <= currentTimelineIndex;
                      return (
                        <div
                          key={`${recommendation.id}-${step.key}`}
                          className={`rounded-2xl border px-3 py-2 text-xs ${
                            isDone
                              ? "border-emerald-200 bg-emerald-500/10 text-emerald-100"
                              : "border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text-muted)]"
                          }`}
                        >
                          {step.label}
                        </div>
                      );
                    })}
                  </div>

                  <WorkspaceSection
                    title="สถานการณ์ของห้องตอนนี้"
                    body={structuredPayload.teacherSummary}
                  />
                  <WorkspaceSection
                    title="ข้อเสนอหลักของระบบ"
                    body={`${structuredPayload.recommendedTeacherMove} ${structuredPayload.whyThisHelps}`.trim()}
                  />
                  <WorkspaceSection
                    title={
                      isInquiryCard
                        ? "บริบทที่ครูเติมเพิ่ม"
                        : "ข้อความที่จะตอบสนองกับนักเรียน"
                    }
                    body={
                      editableDraft ??
                      structuredPayload.studentMessageDraft ??
                      "รอให้ครูเติมข้อความที่ต้องการสื่อสารก่อน"
                    }
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teacher-dashboard-text-muted)]">
                    {isInquiryCard
                      ? "คำถามตั้งต้นสำหรับเก็บบริบท"
                      : "ข้อความตั้งต้นที่ครูปรับและใช้ต่อได้"}
                  </p>
                  <div className="rounded-[24px] border border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] px-4 py-3">
                    <p className="text-sm font-medium leading-relaxed text-[var(--teacher-dashboard-text)]">
                      {editableDraft || "ยังไม่มีข้อความตั้งต้นในรอบนี้"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isInquiryCard && (
          <div className="rounded-[24px] border border-[rgba(167,139,250,0.28)] bg-violet-500/10 px-4 py-3 text-sm leading-6 text-violet-100">
            รอบนี้ยังเหมาะกับการเก็บบริบทจากครูก่อน
            เพื่อให้คำแนะนำรอบถัดไปตรงกับสถานการณ์ของห้องมากขึ้น
          </div>
        )}

        {recommendation.reasoningSummary && !isDecisionWorkspace && (
          <div className="teacher-surface-soft rounded-[24px] border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teacher-dashboard-text-muted)]">
              สรุปที่ควรรู้ตอนนี้
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--teacher-dashboard-text)]">
              {recommendation.reasoningSummary}
            </p>
          </div>
        )}

        {(isDecisionWorkspace
          ? recommendation.teacherPlan.length > 0
          : recommendation.actions.length > 0) && (
          <div className="teacher-surface-soft rounded-[24px] border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teacher-dashboard-text-muted)]">
              แผนที่ครูลองใช้ได้ทันที
            </p>
            <ul className="mt-2 space-y-2 text-sm text-[var(--teacher-dashboard-text)]">
              {(isDecisionWorkspace
                ? recommendation.teacherPlan
                : recommendation.actions
              ).map((action, index) => (
                <li
                  key={`${recommendation.id}-${index}`}
                  className="flex gap-2"
                >
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-300" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isDecisionWorkspace && recommendation.watchSignals.length > 0 && (
          <div className="teacher-surface-soft rounded-[24px] border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teacher-dashboard-text-muted)]">
              หลังคาบนี้ช่วยสังเกตเพิ่ม
            </p>
            <ul className="mt-2 space-y-2 text-sm text-[var(--teacher-dashboard-text)]">
              {recommendation.watchSignals.map((signal, index) => (
                <li key={`${recommendation.id}-watch-${index}`} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-300" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.fallbackUsed && (
          <div className="teacher-surface-soft rounded-[24px] border border-dashed px-4 py-3 text-sm leading-6 text-[var(--teacher-dashboard-text-muted)]">
            ข้อความนี้สรุปจากบริบทล่าสุดของห้อง เพื่อให้ครูมีข้อความตั้งต้นที่อ่านง่ายก่อนปรับใช้จริง
          </div>
        )}

        {recommendation.teacherActionNote && (
          <div className="teacher-surface-soft rounded-[24px] p-3 text-xs text-[var(--teacher-dashboard-text-muted)]">
            <span className="font-medium">สิ่งที่ครูเคยบันทึกไว้:</span>{" "}
            {recommendation.teacherActionNote}
          </div>
        )}

        {recommendation.dismissalReason && !isPending && (
          <div className="rounded-[24px] bg-rose-500/10 p-3 text-xs text-rose-200">
            <span className="font-medium">เหตุผลที่ปฏิเสธ:</span>{" "}
            {recommendation.dismissalReason}
          </div>
        )}

        {showInput && isPending && (
          <div className="teacher-surface-soft space-y-3 rounded-[24px] border p-4">
            {showInput === "edit" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-dashboard-text-muted)]">
                  <Pencil className="h-3.5 w-3.5" />
                    {isInquiryCard
                      ? "คำถามตั้งต้นสำหรับเก็บบริบท"
                      : "ข้อความที่จะตอบสนองกับนักเรียน"}
                </div>
                <Textarea
                  value={draftEditorValue}
                  onChange={(event) => setDraftEditorValue(event.target.value)}
                  placeholder={
                    isInquiryCard
                      ? "ปรับคำถามหรือข้อความที่ใช้เก็บบริบทก่อนบันทึก…"
                      : "ปรับข้อความที่จะตอบสนองกับนักเรียนให้เหมาะกับห้องนี้…"
                  }
                  rows={4}
                  className="min-h-28 rounded-2xl border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface)] text-[var(--teacher-dashboard-text)] placeholder:text-[var(--teacher-dashboard-text-muted)]"
                />
                <p className="text-xs text-[var(--teacher-dashboard-text-muted)]">
                  {isInquiryCard
                    ? "บันทึกเพื่อปรับถ้อยคำของคำถามก่อนเก็บบริบทภายใน"
                    : "บันทึกเพื่อปรับข้อความที่จะส่งต่อให้นักเรียนก่อนอนุมัติ"}
                </p>
              </div>
            )}
            {showInput !== "edit" && showInput !== "feedback" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-dashboard-text-muted)]">
                  {showInput === "approve" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {isInquiryCard
                        ? "บริบทที่ครูอยากเติมเพิ่ม"
                        : "สิ่งที่ครูจะสื่อสารหรือทำต่อ"}
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
                    <p className="text-xs text-[var(--teacher-dashboard-text-muted)]">
                      {isInquiryCard
                        ? "ข้อมูลส่วนนี้ใช้เป็นบริบทภายในเพื่อช่วยให้ระบบตีความห้องได้ตรงขึ้น และจะไม่แสดงให้นักเรียนเห็น"
                        : "ถ้าใส่ข้อความนี้ นักเรียนจะเห็นในส่วนอัปเดตจากครูของหน้าฟีดแบ็ก"}
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
                                ? "border-sky-200 bg-sky-500/10 text-sky-100 hover:bg-sky-500/10 hover:text-sky-100"
                                : "border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface)] text-[var(--teacher-dashboard-text-muted)] hover:bg-[var(--teacher-dashboard-surface-soft)] hover:text-[var(--teacher-dashboard-text)]"
                            }
                            aria-pressed={isSelected}
                          >
                            {action}
                          </Button>
                        );
                      })}
                    </div>
                    {(hasMoreQuickActions && !showAllQuickActions) ||
                    selectedQuickAction ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {hasMoreQuickActions && !showAllQuickActions && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllQuickActions(true)}
                            className="h-7 px-2 text-xs text-[var(--teacher-dashboard-text-muted)] hover:text-[var(--teacher-dashboard-text)]"
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
                            className="h-7 px-2 text-xs text-[var(--teacher-dashboard-text-muted)] hover:text-[var(--teacher-dashboard-text)]"
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
                    showInput === "approve" || showInput === "implemented"
                      ? isInquiryCard
                        ? "เติมบริบทสั้น ๆ ว่าปัญหาน่าจะเกิดช่วงไหนของคาบ หรืออยากให้ระบบช่วยอะไรต่อ…"
                        : showInput === "implemented"
                          ? "ถ้าต้องการแชร์ผลที่ลองใช้แล้วให้นักเรียนเห็น ให้พิมพ์ข้อความสั้น ๆ ตรงนี้…"
                          : "ระบุว่าคุณครูจะตอบสนองหรือสื่อสารกับห้องนี้อย่างไร…"
                      : "ระบุเหตุผลที่ปฏิเสธฉบับร่างนี้…"
                  }
                  rows={3}
                  className="min-h-24 rounded-2xl border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface)] text-[var(--teacher-dashboard-text)] placeholder:text-[var(--teacher-dashboard-text-muted)]"
                />
              </div>
            )}
            {showInput === "feedback" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-dashboard-text-muted)]">
                  <Check className="h-3.5 w-3.5" />
                  หลังคาบนี้ช่วยสะท้อนผลสั้น ๆ
                </div>
                <Textarea
                  value={feedbackNote}
                  onChange={(event) => setFeedbackNote(event.target.value)}
                  placeholder={
                    recommendation.postClassReflectionPrompt ??
                    "หลังลองใช้แล้ว เด็กตอบสนองอย่างไร และยังควรปรับอะไรต่อ"
                  }
                  rows={3}
                  className="min-h-24 rounded-2xl border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface)] text-[var(--teacher-dashboard-text)] placeholder:text-[var(--teacher-dashboard-text-muted)]"
                />
              </div>
            )}
            {(showInput === "approve" || showInput === "edit") &&
              isDraftEmpty && (
                <p className="text-xs text-rose-300">
                  ข้อความร่างต้องไม่ว่างก่อนกดอนุมัติ
                </p>
              )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={
                  showInput === "edit"
                  ? handleSaveDraft
                    : showInput === "approve"
                      ? () => handleApprove()
                      : showInput === "implemented"
                        ? handleImplemented
                        : showInput === "feedback"
                          ? handleFeedbackSubmit
                          : showInput === "not_actioned"
                            ? handleNotActioned
                      : handleDismiss
                }
                disabled={
                  loading ||
                  ((showInput === "approve" || showInput === "edit") &&
                    isDraftEmpty) ||
                  (showInput === "feedback" && feedbackNote.trim().length === 0)
                }
                className={
                  showInput === "approve" || showInput === "implemented"
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : showInput === "edit"
                      ? "bg-sky-600 text-white hover:bg-sky-500"
                      : showInput === "feedback"
                        ? "bg-teal-600 text-white hover:bg-teal-500"
                      : "bg-slate-700 text-white hover:bg-slate-600"
                }
              >
                {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {showInput === "edit"
                  ? "บันทึก"
                  : showInput === "approve"
                    ? isInquiryCard
                      ? "บันทึกบริบทนี้"
                      : shareWithStudents
                        ? "อนุมัติและแชร์ให้นักเรียน"
                        : "อนุมัติไว้ใช้ภายใน"
                    : showInput === "implemented"
                      ? "บันทึกว่าลองใช้แล้ว"
                      : showInput === "feedback"
                        ? "บันทึก feedback"
                        : showInput === "not_actioned"
                          ? "บันทึกว่ายังไม่ใช้ตอนนี้"
                    : "ยืนยันการข้าม"}
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
                ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {isPending && !showInput && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-sky-200 bg-[var(--teacher-dashboard-surface)] text-sky-200 hover:bg-[var(--teacher-dashboard-surface-soft)] hover:text-sky-100"
              onClick={handleOpenEdit}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              {isInquiryCard ? "แก้บริบท" : "แก้ข้อความ"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-emerald-200 bg-[var(--teacher-dashboard-surface)] text-emerald-200 hover:bg-[var(--teacher-dashboard-surface-soft)] hover:text-emerald-100"
              onClick={() => handleApprove("")}
              disabled={loading || isDraftEmpty}
            >
              {loading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              <Check className="mr-1 h-3.5 w-3.5" />
              {isInquiryCard ? "อนุมัติบริบทนี้" : "อนุมัติ"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface)] text-[var(--teacher-dashboard-text-muted)] hover:bg-[var(--teacher-dashboard-surface-soft)] hover:text-[var(--teacher-dashboard-text)]"
              onClick={() => setShowInput("dismiss")}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              ข้าม
            </Button>
          </div>
        )}

        {historyMode && onRestore && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-sky-200 bg-[var(--teacher-dashboard-surface)] text-sky-200 hover:bg-[var(--teacher-dashboard-surface-soft)] hover:text-sky-100"
              onClick={async () => {
                setLoading(true);
                await onRestore(recommendation.id);
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              <History className="mr-1 h-3.5 w-3.5" />
              Restore ข้อความนี้
            </Button>
          </div>
        )}

        {!historyMode &&
          !isPending &&
          recommendation.actionStatus === "approved" &&
          !showInput && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-emerald-200 bg-[var(--teacher-dashboard-surface)] text-emerald-200 hover:bg-[var(--teacher-dashboard-surface-soft)] hover:text-emerald-100"
              onClick={() => setShowInput("implemented")}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              ทำแล้ว
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface)] text-[var(--teacher-dashboard-text-muted)] hover:bg-[var(--teacher-dashboard-surface-soft)] hover:text-[var(--teacher-dashboard-text)]"
              onClick={() => setShowInput("feedback")}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              ให้ feedback
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface)] text-[var(--teacher-dashboard-text-muted)] hover:bg-[var(--teacher-dashboard-surface-soft)] hover:text-[var(--teacher-dashboard-text)]"
              onClick={() => setShowInput("not_actioned")}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              ยังไม่ใช้ตอนนี้
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkspaceSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="teacher-surface-soft rounded-[24px] border px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teacher-dashboard-text-muted)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--teacher-dashboard-text)]">
        {body}
      </p>
    </div>
  );
}

function getConfidenceTone(label: RecommendationConfidenceLabel) {
  if (label === "สูง") {
    return {
      label: "พร้อมใช้ได้ทันที",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (label === "กลาง") {
    return {
      label: "ควรอ่านก่อนใช้",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "ควรปรับก่อนใช้",
      className: "border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text-muted)]",
  };
}
