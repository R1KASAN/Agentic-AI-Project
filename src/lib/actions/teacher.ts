"use server";

import { createClient } from "@/lib/supabase/server";

export async function approveRecommendation(id: string, note: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Verify teacher role
    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "teacher") {
        return { error: "Forbidden" };
    }

    // Update recommendation status
    const { error: updateError } = await supabase
        .from("recommendations")
        .update({
            status: "approved",
            action_taken_note: note || null,
        })
        .eq("id", id);

    if (updateError) {
        console.error("Approve recommendation error:", updateError);
        return { error: "Failed to approve recommendation" };
    }

    // Insert audit log
    await supabase.from("action_logs").insert({
        actor_id: user.id,
        action_type: "recommendation_approved",
        target_type: "recommendation",
        target_id: id,
        details: { note },
    });

    return { success: true };
}

export async function dismissRecommendation(id: string, reason: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Verify teacher role
    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "teacher") {
        return { error: "Forbidden" };
    }

    // Update recommendation status
    const { error: updateError } = await supabase
        .from("recommendations")
        .update({
            status: "dismissed",
            action_taken_note: reason || null,
        })
        .eq("id", id);

    if (updateError) {
        console.error("Dismiss recommendation error:", updateError);
        return { error: "Failed to dismiss recommendation" };
    }

    // Insert audit log
    await supabase.from("action_logs").insert({
        actor_id: user.id,
        action_type: "recommendation_dismissed",
        target_type: "recommendation",
        target_id: id,
        details: { reason },
    });

    return { success: true };
}

export async function communicateRecommendation(id: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const { error: updateError } = await supabase
        .from("recommendations")
        .update({ communicated_to_students: true })
        .eq("id", id)
        .eq("status", "approved");

    if (updateError) {
        console.error("Communicate recommendation error:", updateError);
        return { error: "Failed to communicate recommendation" };
    }

    await supabase.from("action_logs").insert({
        actor_id: user.id,
        action_type: "recommendation_communicated",
        target_type: "recommendation",
        target_id: id,
    });

    return { success: true };
}
