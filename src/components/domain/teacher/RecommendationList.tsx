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
  pending: { label: "รออนุมัติ", variant: "warning" },
  approved: { label: "อนุมัติแล้ว", variant: "success" },
  dismissed: { label: "ข้ามแล้ว", variant: "secondary" },
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
  emptyStateTitle = "ยังไม่มีประวัติข้อความรออนุมัติ",
  emptyStateBody = "ฉบับร่างและการตัดสินของครูจะแสดงที่นี่เมื่อห้องมีสัญญาณเพียงพอ",
}: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <Card className="student-surface overflow-hidden rounded-[28px] border border-dashed border-sky-200/60 shadow-[0_18px_40px_rgba(2,8,23,0.14)]">
        <CardContent className="flex flex-col items-center justify-center space-y-3 py-10 text-center">
          <Sparkles className="h-8 w-8 text-sky-200" />
          <p className="text-sm font-medium text-[var(--student-dashboard-text)]">
            {emptyStateTitle}
          </p>
          <p className="max-w-md text-sm text-[var(--student-dashboard-text-muted)]">
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
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(
    null,
  );
  const [showAllQuickActions, setShowAllQuickActions] = useState(false);
  const initialDraft = recommendation.aiMessageDraft ?? "";
  const [editableDraft, setEditableDraft] = useState(initialDraft);
  const [draftEditorValue, setDraftEditorValue] = useState(initialDraft);
  const [showInput, setShowInput] = useState<
    "edit" | "approve" | "dismiss" | null
  >(null);

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
  const hasMoreQuickActions =
    quickActions.length > INITIAL_VISIBLE_QUICK_ACTIONS;

  async function handleApprove() {
    setLoading(true);
    await (onApprove ?? (async () => {}))(
      recommendation.id,
      draftNote,
      editableDraft.trim(),
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
          ? "student-surface overflow-hidden rounded-[28px] border border-violet-200/60 shadow-[0_18px_40px_rgba(2,8,23,0.16)]"
          : "student-surface overflow-hidden rounded-[28px] border shadow-[0_18px_40px_rgba(2,8,23,0.16)]"
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
                    โหมดค้นหาบริบท
                  </Badge>
                )}
                {recommendation.fallbackUsed && (
                  <Badge
                    variant="secondary"
                    className="border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-soft)] text-[10px] text-[var(--student-dashboard-text-muted)]"
                  >
                    <Wand2 className="mr-1 h-3 w-3" />
                    ใช้ safety fallback
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
                  className="text-[10px] text-[var(--student-dashboard-text-muted)]"
                >
                  {RATIONALE_LABELS[recommendation.rationaleTag]}
                </Badge>
                <span className="flex items-center gap-1 text-[10px] text-[var(--student-dashboard-text-muted)]">
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

              <p className="text-sm font-medium leading-relaxed text-[var(--student-dashboard-text)]">
                {editableDraft || "ยังไม่มีข้อความร่าง"}
              </p>
            </div>
          </div>
        </div>

        {isInquiryCard && (
          <div className="rounded-[24px] border border-violet-200/60 bg-violet-500/10 px-4 py-3 text-sm leading-6 text-violet-100">
            ระบบกำลังใช้โหมดค้นหาบริบท
            เพราะสัญญาณจากการตอบสนองก่อนหน้าบอกว่าควรชวนครูสะท้อนบริบทเพิ่มเติม
            แทนการเร่งเสนอทางแก้
          </div>
        )}

        {recommendation.reasoningSummary && (
          <div className="rounded-[24px] border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--student-dashboard-text-muted)]">
              เหตุผลที่ระบบเสนอฉบับร่างนี้
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--student-dashboard-text)]">
              {recommendation.reasoningSummary}
            </p>
          </div>
        )}

        {recommendation.actions.length > 0 && (
          <div className="rounded-[24px] border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--student-dashboard-text-muted)]">
              ตัวอย่างแนวทางตอบสนอง
            </p>
            <ul className="mt-2 space-y-2 text-sm text-[var(--student-dashboard-text)]">
              {recommendation.actions.map((action, index) => (
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

        {recommendation.fallbackUsed && (
          <div className="rounded-[24px] border border-dashed border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] px-4 py-3 text-sm leading-6 text-[var(--student-dashboard-text-muted)]">
            ฉบับร่างนี้มาจาก safety fallback แบบ rules-assisted
            เพื่อคงคุณภาพขั้นต่ำของข้อเสนอ แม้ความมั่นใจของโมเดลจะยังไม่สูงมาก
          </div>
        )}

        {recommendation.teacherActionNote && (
          <div className="rounded-[24px] bg-[var(--student-dashboard-surface-soft)] p-3 text-xs text-[var(--student-dashboard-text-muted)]">
            <span className="font-medium">บันทึกการตอบสนองของครู:</span>{" "}
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
          <div className="space-y-3 rounded-[24px] border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-4">
            {showInput === "edit" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--student-dashboard-text-muted)]">
                  <Pencil className="h-3.5 w-3.5" />
                  ข้อความที่จะสื่อสารกับนักเรียน
                </div>
                <Textarea
                  value={draftEditorValue}
                  onChange={(event) => setDraftEditorValue(event.target.value)}
                  placeholder="ปรับข้อความที่ต้องการสื่อสารกับนักเรียนก่อนอนุมัติ…"
                  rows={4}
                  className="min-h-28 rounded-2xl border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] placeholder:text-[var(--student-dashboard-text-muted)]"
                />
                <p className="text-xs text-[var(--student-dashboard-text-muted)]">
                  กดบันทึกเพื่ออัปเดตข้อความที่จะสื่อสารบนการ์ดนี้ก่อนค่อยไปขั้นอนุมัติ
                </p>
              </div>
            )}
            {showInput !== "edit" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--student-dashboard-text-muted)]">
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
                    <p className="text-xs text-[var(--student-dashboard-text-muted)]">
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
                                ? "border-sky-200 bg-sky-500/10 text-sky-100 hover:bg-sky-500/10 hover:text-sky-100"
                                : "border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text-muted)] hover:bg-[var(--student-dashboard-surface-raised)] hover:text-[var(--student-dashboard-text)]"
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
                            className="h-7 px-2 text-xs text-[var(--student-dashboard-text-muted)] hover:text-[var(--student-dashboard-text)]"
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
                            className="h-7 px-2 text-xs text-[var(--student-dashboard-text-muted)] hover:text-[var(--student-dashboard-text)]"
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
                      : "ระบุเหตุผลที่ปฏิเสธฉบับร่างนี้…"
                  }
                  rows={3}
                  className="min-h-24 rounded-2xl border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] placeholder:text-[var(--student-dashboard-text-muted)]"
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
                      ? handleApprove
                      : handleDismiss
                }
                disabled={
                  loading ||
                  ((showInput === "approve" || showInput === "edit") &&
                    isDraftEmpty) ||
                  (showInput === "approve" && cannotApprove)
                }
                className={
                  showInput === "approve"
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : showInput === "edit"
                      ? "bg-sky-600 text-white hover:bg-sky-500"
                      : "bg-slate-700 text-white hover:bg-slate-600"
                }
              >
                {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {showInput === "edit"
                  ? "บันทึก"
                  : showInput === "approve"
                    ? "ยืนยันการอนุมัติ"
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
              className="h-11 rounded-2xl border-sky-200 bg-[var(--student-dashboard-surface)] text-sky-200 hover:bg-[var(--student-dashboard-surface-raised)] hover:text-sky-100"
              onClick={handleOpenEdit}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              แก้ข้อความที่จะสื่อสาร
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-emerald-200 bg-[var(--student-dashboard-surface)] text-emerald-200 hover:bg-[var(--student-dashboard-surface-raised)] hover:text-emerald-100"
              onClick={handleOpenApprove}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              {isInquiryCard ? "ส่งต่อพร้อมบริบท" : "อนุมัติ"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-2xl border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text-muted)] hover:bg-[var(--student-dashboard-surface-raised)] hover:text-[var(--student-dashboard-text)]"
              onClick={() => setShowInput("dismiss")}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              ข้าม
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
