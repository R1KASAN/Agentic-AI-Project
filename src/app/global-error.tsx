"use client";

export default function GlobalError({
    reset,
}: {
    _error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
                <div className="text-center space-y-4 px-6">
                    <h2 className="text-2xl font-bold">เกิดข้อผิดพลาดร้ายแรง</h2>
                    <p className="text-sm text-slate-400">
                        Something went seriously wrong. Please try again.
                    </p>
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 rounded-md bg-white text-slate-900 text-sm font-medium hover:bg-slate-200 transition"
                    >
                        ลองใหม่ / Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
