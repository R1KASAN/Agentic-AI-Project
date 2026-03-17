"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Download, Check, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface QrCodeDialogProps {
    classId: string;
    className: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function QrCodeDialog({ classId, className, open, onOpenChange }: QrCodeDialogProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const checkInUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/qr/${classId}`
            : `/qr/${classId}`;

    // Render QR to canvas when dialog opens
    useEffect(() => {
        if (!open || !canvasRef.current) return;

        QRCode.toCanvas(canvasRef.current, checkInUrl, {
            width: 256,
            margin: 2,
            color: {
                dark: "#0f172a",
                light: "#ffffff",
            },
        }).catch(console.error);
    }, [open, checkInUrl]);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(checkInUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const el = document.createElement("textarea");
            el.value = checkInUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await fetch(`/api/qr/${classId}/image`);
            if (!res.ok) throw new Error("Failed to generate QR image");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `qr-checkin-${className.replace(/\s+/g, "-")}.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        QR Check-in Code
                    </DialogTitle>
                    <DialogDescription>
                        Display or share this QR code. Students scan it to submit an anonymous mood check-in.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-2">
                    {/* Class name badge */}
                    <p className="text-sm font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 px-3 py-1 rounded-full border border-sky-200 dark:border-sky-800 truncate max-w-full">
                        {className}
                    </p>

                    {/* QR Canvas */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <canvas ref={canvasRef} width={256} height={256} className="rounded" />
                    </div>

                    {/* URL */}
                    <p className="text-xs text-muted-foreground font-mono break-all text-center px-2">
                        {checkInUrl}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleCopyLink}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2 text-emerald-500" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Link
                                </>
                            )}
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleDownload}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download PNG
                                </>
                            )}
                        </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground text-center">
                        🔒 Responses are completely anonymous — no student identity is stored.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
