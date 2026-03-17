import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { QrCheckInClient } from "./QrCheckInClient";

interface PageProps {
    params: Promise<{ classId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { classId } = await params;
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: cls } = await supabase
        .from("classes")
        .select("name")
        .eq("id", classId)
        .maybeSingle();

    return {
        title: cls ? `Check-in — ${cls.name}` : "Check-in",
    };
}

export default async function QrCheckInPage({ params }: PageProps) {
    const { classId } = await params;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: cls } = await supabase
        .from("classes")
        .select("id, name, archived_at")
        .eq("id", classId)
        .maybeSingle();

    if (!cls) notFound();

    if (cls.archived_at) {
        return (
            <div className="text-center max-w-sm space-y-3">
                <p className="text-4xl">🔒</p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    Class Closed
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    This class is no longer accepting check-ins.
                </p>
            </div>
        );
    }

    return <QrCheckInClient classId={classId} className={cls.name} />;
}
