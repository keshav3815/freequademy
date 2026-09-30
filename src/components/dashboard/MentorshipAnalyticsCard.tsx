import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MentorshipSummary as Summary } from "@/hooks/dashboardTypes";

/**
 * Mentorship analytics. The next session's meeting link is deliberately NOT
 * part of `summary` — it's fetched on demand via get_session_meeting_link()
 * only when the student clicks Join, exactly like MySessions.tsx (Phase 0's
 * authorization rule: a meeting link is never bulk-exposed).
 */
export default function MentorshipAnalyticsCard({ summary }: { summary: Summary | null }) {
  const { toast } = useToast();

  const join = async () => {
    if (!summary?.next_session_id) return;
    const { data: link } = await supabase.rpc("get_session_meeting_link", { _session_id: summary.next_session_id });
    if (!link) {
      toast({ title: "No meeting link yet", description: "Your mentor hasn't added one for this session yet." });
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
        <h3 className="font-semibold">Mentorship</h3>
      </div>

      {!summary ? (
        <p className="text-sm text-muted-foreground">Not available.</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center mb-4">
            <div className="rounded-lg bg-muted/40 p-2">
              <dt className="text-[10px] text-muted-foreground">Upcoming</dt>
              <dd className="text-base font-bold">{summary.upcoming_count}</dd>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <dt className="text-[10px] text-muted-foreground">Completed</dt>
              <dd className="text-base font-bold">{summary.completed_count}</dd>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <dt className="text-[10px] text-muted-foreground">Attendance</dt>
              <dd className="text-base font-bold">{summary.attendance_pct === null ? "—" : `${summary.attendance_pct}%`}</dd>
            </div>
          </dl>

          {summary.next_session_id ? (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Upcoming</p>
              <p className="font-medium">{summary.next_session_title}</p>
              {summary.next_mentor_name && <p className="text-sm text-muted-foreground">with {summary.next_mentor_name}</p>}
              <p className="text-sm text-muted-foreground mb-2">
                {new Date(summary.next_session_at!).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              <Button size="sm" onClick={join}>Join Session</Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>No upcoming sessions.</p>
              <Button asChild size="sm" variant="outline"><Link to="/mentorship">Find a mentor</Link></Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
