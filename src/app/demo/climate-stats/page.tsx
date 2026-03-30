import { createClient } from '@supabase/supabase-js';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, BarChart2 } from "lucide-react";

/**
 * Demo page to visualize Class Climate Agent statistics.
 * Directly queries Supabase for the 'v_teacher_recommendation_stats' view.
 */
export const dynamic = "force-dynamic";

export default async function ClimateStatsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase
    .from('v_teacher_recommendation_stats')
    .select('*');

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Class Climate Agent Stats</h1>
        <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
          <BarChart2 className="w-4 h-4 mr-2 inline" />
          Live Audit Data
        </Badge>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-semibold">Recommendation Metrics (per Class)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Class ID</th>
                <th className="px-6 py-4 text-center">Total Events</th>
                <th className="px-6 py-4 text-center">Approved</th>
                <th className="px-6 py-4 text-center">Dismissed</th>
                <th className="px-6 py-4 text-right">Action Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data && data.length > 0 ? (
                data.map((row) => {
                  const total = row.total_events || 0;
                  const approved = row.approved_count || 0;
                  const dismissed = row.dismissed_count || 0;
                  const actioned = approved + dismissed;
                  const rate = total > 0 ? ((actioned / total) * 100).toFixed(1) : "0";

                  return (
                    <tr key={row.class_id ?? 'root'} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs max-w-[200px] truncate">
                        {row.class_id ?? (
                          <span className="text-muted-foreground italic">Global/Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold">
                        {total}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          {approved}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center text-red-600">
                          <XCircle className="w-4 h-4 mr-1.5" />
                          {dismissed}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant={Number(rate) > 50 ? "default" : "secondary"}>
                          {rate}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Interactions</div>
            <div className="text-3xl font-bold mt-2">
              {data?.reduce((acc, curr) => acc + (curr.total_events || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Teacher Approvals</div>
            <div className="text-3xl font-bold mt-2 text-green-600">
              {data?.reduce((acc, curr) => acc + (curr.approved_count || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Engagement Rate</div>
            <div className="text-3xl font-bold mt-2 text-indigo-600">
              {(() => {
                const total = data?.reduce((acc, curr) => acc + (curr.total_events || 0), 0) || 0;
                const actioned = data?.reduce((acc, curr) => acc + (curr.approved_count || 0) + (curr.dismissed_count || 0), 0) || 0;
                return total > 0 ? ((actioned / total) * 100).toFixed(1) : "0";
              })()}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
