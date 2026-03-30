import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ classId: string }> }
) {
    const { classId } = await params;

    // Validate class exists
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: cls } = await supabase
        .from("classes")
        .select("id")
        .eq("id", classId)
        .maybeSingle();

    if (!cls) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const qrUrl = `${baseUrl}/qr/${classId}`;

    const pngBuffer = await QRCode.toBuffer(qrUrl, {
        type: "png",
        width: 512,
        margin: 2,
        color: {
            dark: "#0f172a",
            light: "#ffffff",
        },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename="qr-checkin-${classId}.png"`,
            "Cache-Control": "public, max-age=3600",
        },
    });
}
