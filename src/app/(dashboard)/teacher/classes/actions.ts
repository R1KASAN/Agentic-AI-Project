"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Generates a cryptographically safe 8-char uppercase alphanumeric code (A-Z0-9). */
function generateInviteCode(): string {
    const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusable chars I, O, 0, 1
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => ALPHABET[b % ALPHABET.length])
        .join("");
}

export async function archiveClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { error: updateError } = await supabase
        .from("classes")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", classId)
        .eq("teacher_id", user.id);

    if (updateError) {
        console.error("Archive error:", updateError);
        return { success: false, error: "Failed to archive class" };
    }

    revalidatePath("/teacher/classes");
    revalidatePath("/teacher");
    return { success: true };
}

export async function createClassAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const name = (formData.get("name") as string)?.trim();
    if (!name) {
        return { success: false, error: "Class name is required" };
    }

    // Generate a unique invite code with retry on collision
    let invite_code = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
        const { data: existing } = await supabase
            .from("classes")
            .select("id")
            .eq("invite_code", invite_code)
            .maybeSingle();
        if (!existing) break;
        invite_code = generateInviteCode();
        attempts++;
    }

    const { data: newClass, error } = await supabase
        .from("classes")
        .insert({
            name,
            teacher_id: user.id,
            invite_code,
            archived_at: null,
        })
        .select()
        .single();

    if (error) {
        console.error("Create class error:", error);
        return { success: false, error: "Failed to create class. " + error.message };
    }

    revalidatePath("/teacher/classes");
    revalidatePath("/teacher");
    return { success: true, data: newClass };
}

