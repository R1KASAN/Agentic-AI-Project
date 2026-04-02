"use client";

import React, { useState, useTransition } from "react";
import {
  dismissRecommendation,
} from "@/lib/actions/recommendations";
import type { TeacherRecommendationRow } from "@/lib/schemas/recommendations";
import { approveRecommendationAction } from "@/app/(teacher)/actions/approveRecommendation";
import { AlertCircle, Check, X, Clock, AlertTriangle, Info } from "lucide-react";

export function TeacherRecommendationsClient({ 
  initialItems
}: { 
  initialItems: TeacherRecommendationRow[];
  teacherId: string;
  teacherEmail: string;
}) {
  const [items] = useState<TeacherRecommendationRow[]>(initialItems);

  if (items.length === 0) {
    return (
      <div 
        data-testid="empty-recommendations" 
        className="flex flex-col items-center justify-center p-12 text-slate-400 border border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/50"
      >
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <p>คุณจัดการคำแนะนำทั้งหมดเรียบร้อยแล้ว ยอดเยี่ยมมาก!</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-col">
      {items.map(item => (
        <RecommendationCard 
          key={item.id} 
          item={item}
        />
      ))}
    </div>
  );
}

function RecommendationCard({ 
  item
}: { 
  item: TeacherRecommendationRow;
}) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [dismissReason, setDismissReason] = useState("");
  const [isDismissing, setIsDismissing] = useState(false);
  
  const [actionError, setActionError] = useState<string | null>(null);
  const [webhookWarning, setWebhookWarning] = useState<boolean>(false);
  const [localStatus, setLocalStatus] = useState<TeacherRecommendationRow['status']>(item.status);

  const isActionable = localStatus === 'pending';
  const requireNote = item.inquiry_mode;
  const cannotApprove = requireNote && note.trim().length === 0;
  const willShareToStudents = !item.inquiry_mode && note.trim().length > 0;

  const handleApprove = () => {
    console.log('[UI] handleApprove clicked', { 
      recommendationId: item.id, 
      classId: item.class_id 
    });
    setActionError(null);
    setWebhookWarning(false);
    
    startTransition(async () => {
      try {
        console.log('[UI] calling approveRecommendationAction...');
        const res = await approveRecommendationAction({
          classId: item.class_id,
          recommendationId: item.id,
          note: note.trim(),
          shareWithStudents: !item.inquiry_mode,
        });

        console.log('[UI] approve result', res);

        if (res.success) {
          setLocalStatus('approved');
        } else {
          setActionError(`เกิดข้อผิดพลาด ไม่สามารถอนุมัติได้ในขณะนี้ (${res.error})`);
        }
      } catch {
        setActionError("ระบบขัดข้อง โปรดลองใหม่อีกครั้ง");
      }
    });
  };

  const handleDismiss = () => {
    if (!isDismissing) {
      setIsDismissing(true);
      return;
    }
    
    if (dismissReason.trim().length === 0) {
      setActionError("กรุณาระบุเหตุผลที่ปฏิเสธคำแนะนำนี้");
      return;
    }

    setActionError(null);
    startTransition(async () => {
      try {
        const result = await dismissRecommendation({ id: item.id, dismissalReason: dismissReason.trim() });
        if (result.success) {
          setLocalStatus('dismissed');
        } else {
          setActionError("เกิดข้อผิดพลาด ไม่สามารถปฏิเสธได้");
        }
      } catch {
        setActionError("ระบบขัดข้อง โปรดลองใหม่อีกครั้ง");
      }
    });
  };

  const badgeColor = {
    ROUTINE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200',
    WARNING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200',
    CRITICAL: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200',
  }[item.policy_level];
  const decisionPath = item.decision_path_json as
    | { reason?: string }
    | null
    | undefined;

  return (
    <div 
      data-testid="recommendation-card"
      className={`p-5 rounded-xl border bg-white dark:bg-slate-950 transition-all ${
        localStatus === 'approved' ? 'border-emerald-200 bg-emerald-50/30' : 
        localStatus === 'dismissed' ? 'border-slate-200 opacity-60' : 'border-slate-200 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {item.classes.name}
          </span>
          <span 
            data-testid="policy-badge"
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}
          >
            {item.policy_level}
          </span>
          {item.confidence_score > 0 && (
            <span className="text-xs text-slate-500 font-medium">
              {Math.round(item.confidence_score * 100)}% Confidence
            </span>
          )}
          {item.inquiry_mode && (
            <span 
              data-testid="inquiry-badge"
              className="flex items-center gap-1 text-xs font-medium text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200"
            >
              <Info className="w-3 h-3" /> Inquiry Mode
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {new Date(item.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      </div>

      {/* Content */}
      <div className="text-slate-700 dark:text-slate-300 text-sm mb-4 leading-relaxed">
        {item.ai_message_draft}
      </div>

      {decisionPath?.reason && (
        <div 
          data-testid="ai-reason"
          className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-3 rounded-md mb-4 border border-slate-100 dark:border-slate-800"
        >
          <strong>เหตุผล (AI):</strong> {decisionPath.reason}
        </div>
      )}

      {/* Alerts */}
      {actionError && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-md text-sm mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}
      
      {webhookWarning && (
        <div 
          data-testid="webhook-warning"
          className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md text-sm mb-4"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>คำตอบบันทึกแล้ว แต่ระบบส่งต่อไปยังการแจ้งเตือนไม่สำเร็จ ระบบจะลองใหม่ภายหลัง</span>
        </div>
      )}

      {/* Action Area */}
      {isActionable ? (
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {!isDismissing && (
            <div className="flex flex-col gap-1">
              {item.inquiry_mode && (
                <label className="text-xs font-semibold text-sky-700">
                  * กรุณาระบุบริบทเพิ่มเติมให้ AI (จำเป็นสำหรับ Inquiry Mode)
                </label>
              )}
              <textarea
                data-testid="note-input"
                className="w-full text-sm p-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 resize-none"
                placeholder={
                  item.inquiry_mode
                    ? "บริบทภายในสำหรับระบบและครู..."
                    : "ข้อความถึงนักเรียน (ถ้ามี)..."
                }
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs leading-5 text-slate-500">
                {item.inquiry_mode
                  ? "ข้อความนี้ใช้เป็นบริบทภายในให้ระบบและจะไม่แสดงให้นักเรียนเห็น"
                  : "ถ้าใส่ข้อความนี้ นักเรียนจะเห็นในหน้า feedback ของห้อง หากไม่ใส่ ระบบจะอนุมัติภายใน แต่ยังไม่แสดงให้นักเรียนเห็น"}
              </p>
            </div>
          )}

          {isDismissing && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-top-1">
              <label className="text-xs font-semibold text-slate-600">
                เหตุผลที่ปฏิเสธคำแนะนำนี้
              </label>
              <textarea
                data-testid="dismiss-reason-input"
                className="w-full text-sm p-3 rounded-md border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 resize-none"
                placeholder="เช่น ข้อมูลไม่ตรงกับสถานการณ์จริง..."
                rows={2}
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-1">
            {isDismissing && (
              <button
                type="button"
                onClick={() => { setIsDismissing(false); setActionError(null); }}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
            )}

            <button
              data-testid="dismiss-btn"
              onClick={handleDismiss}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isDismissing 
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                  : 'text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200'
              } disabled:opacity-50`}
            >
              <X className="w-4 h-4" />
              {isPending && isDismissing ? "กำลังบันทึก..." : isDismissing ? "ยืนยันการปฏิเสธ" : "ปฏิเสธ"}
            </button>

            {!isDismissing && (
              <button
                data-testid="approve-btn"
                onClick={handleApprove}
                disabled={isPending || cannotApprove}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors disabled:opacity-50 disabled:bg-slate-300"
              >
                <Check className="w-4 h-4" />
                {isPending && !isDismissing
                  ? "กำลังบันทึก..."
                  : willShareToStudents
                    ? "อนุมัติและแชร์ถึงนักเรียน"
                    : item.inquiry_mode
                      ? "บันทึกบริบทภายใน"
                      : "อนุมัติภายใน"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
          <span 
            data-testid="status-success"
            className="font-medium text-slate-500"
          >
            {localStatus === 'approved'
              ? willShareToStudents
                ? 'บันทึกและแชร์ให้นักเรียนแล้ว'
                : item.inquiry_mode
                  ? 'บันทึกบริบทภายในให้ระบบแล้ว'
                  : 'บันทึกการอนุมัติภายในแล้ว'
              : 'ปฏิเสธคำแนะนำแล้ว'}
          </span>
          {localStatus === 'approved' && note && willShareToStudents && (
            <span className="text-xs text-slate-400 truncate max-w-[240px]">ข้อความที่แชร์: {note}</span>
          )}
        </div>
      )}
    </div>
  );
}
