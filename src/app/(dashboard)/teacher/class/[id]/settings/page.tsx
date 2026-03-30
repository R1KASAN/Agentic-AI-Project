import { createClient } from "@/lib/supabase/server"
import { ClassSettingsClient } from "./client"

export default async function TeacherClassSettingsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const resolvedParams = await params;
    const classId = resolvedParams.id;
    const supabase = await createClient()

    // 1. Fetch Class Data
    const { data: cls } = await supabase
        .from('classes')
        .select('id, name, invite_code, created_at, teacher_id')
        .eq('id', classId)
        .single()

    if (!cls) {
        return <div className="p-8 text-center text-muted-foreground">Class not found.</div>
    }

    // 2. Fetch Enrolled Students names & emails
    // We use our class_enrollments table and join the users table
    const { data: enrollments } = await supabase
        .from('class_enrollments')
.select(`
    student_id,
    users!inner(id, full_name, email)
  `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })

const students = (enrollments || []).map(e => {
    const user = e.users as unknown as { id: string; full_name: string | null; email: string };
    return {
      id: user.id,
      name: user.full_name || 'Unknown Student',
      email: user.email
    };
  })

    return (
        <ClassSettingsClient
            classId={cls.id}
            className={cls.name}
            inviteCode={cls.invite_code}
            createdAt={cls.created_at}
            students={students}
        />
    )
}
