import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * API Route to fetch climate statistics for the demo dashboard.
 * Reads from the 'v_teacher_recommendation_stats' view.
 * 
 * Uses Service Role Key for elevated access to audit logs.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[StatsAPI] Missing Supabase configuration (URL or Service Role Key)');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Initialize client with Service Role Key for internal stats fetching
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await supabase
      .from('v_teacher_recommendation_stats')
      .select('*');

    if (error) {
      console.error('[StatsAPI] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[StatsAPI] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
