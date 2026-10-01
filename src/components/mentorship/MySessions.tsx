import { useCallback, useEffect, useState } from "react";
import { Calendar, Clock, ExternalLink, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Registration {
  session_id: string;
  status: string;
  session: {
    id: string;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    mentor_id: string | null;
  } | null;
}

/** The signed-in student's session registrations: join, cancel, rate. */
export default function MySessions({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [ratedSessionIds, setRatedSessionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [ratingFor, setRatingFor] = useState<Registration | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [regResult, feedbackResult] = await Promise.all([
      supabase
        .from("session_participants")
        .select("session_id, status, session:mentorship_sessions(id, title, scheduled_at, duration_minutes, status, mentor_id)")
        .eq("student_id", user.id)
        .neq("status", "cancelled"),
      supabase.from("mentorship_feedback").select("session_id").eq("student_id", user.id),
    ]);
    if (regResult.error) {
      toast({ title: "Could not load your sessions", variant: "destructive" });
    }
    const rows = ((regResult.data ?? []) as Registration[]).filter((r) => r.session);
    rows.sort((a, b) => new Date(a.session!.scheduled_at).getTime() - new Date(b.session!.scheduled_at).getTime());
    setRegistrations(rows);
    setRatedSessionIds(new Set((feedbackResult.data ?? []).map((f) => f.session_id as string)));
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const join = async (sessionId: string) => {
    setBusySessionId(sessionId);
    const { data, error } = await supabase.rpc("get_session_meeting_link", { _session_id: sessionId });
    setBusySessionId(null);
    if (error || !data) {
      toast({ title: "No meeting link yet", description: "Your mentor hasn't added a meeting link for this session yet." });
      return;
    }
    window.open(data, "_blank", "noopener,noreferrer");
  };

  const cancel = async (sessionId: string) => {
    setBusySessionId(sessionId);
    const { error } = await supabase.rpc("cancel_session_registration", { _session_id: sessionId });
    setBusySessionId(null);
    if (error) {
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Registration cancelled" });
    load();
  };

  const submitFeedback = async () => {
    if (!user || !ratingFor?.session?.mentor_id || rating < 1) return;
    const { error } = await supabase.from("mentorship_feedback").insert({
      session_id: ratingFor.session_id,
      student_id: user.id,
      mentor_id: ratingFor.session.mentor_id,
      rating,
      feedback_text: feedbackText.trim() || null,
    });
    if (error) {
      toast({ title: "Could not submit feedback", variant: "destructive" });
      return;
    }
    toast({ title: "Thanks for your feedback!" });
    setRatingFor(null);
    setRating(0);
    setFeedbackText("");
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12" role="status" aria-label="Loading your sessions">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (registrations.length === 0) {
    return <p className="text-center text-muted-foreground py-12">You haven't registered for any sessions yet.</p>;
  }

  const now = Date.now();

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {registrations.map((reg) => {
          const session = reg.session!;
          const start = new Date(session.scheduled_at);
          const end = start.getTime() + session.duration_minutes * 60_000;
          const isPast = end < now;
          const canJoin = !isPast && start.getTime() - now < 30 * 60_000;
          return (
            <Card key={reg.session_id}>
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={isPast ? "outline" : "default"}>{isPast ? "Past" : "Upcoming"}</Badge>
                  <Badge variant="secondary" className="capitalize">{reg.status}</Badge>
                </div>
                <CardTitle className="text-lg">{session.title}</CardTitle>
                <CardDescription className="space-y-1">
                  <span className="flex items-center"><Calendar className="mr-2 h-4 w-4" />{start.toLocaleDateString()}</span>
                  <span className="flex items-center"><Clock className="mr-2 h-4 w-4" />{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({session.duration_minutes} min)</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                {!isPast && (
                  <>
                    <Button
                      className="flex-1"
                      disabled={!canJoin || busySessionId === reg.session_id}
                      onClick={() => join(reg.session_id)}
                      title={canJoin ? undefined : "You can join 30 minutes before the session starts"}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Join
                    </Button>
                    <Button variant="outline" disabled={busySessionId === reg.session_id} onClick={() => cancel(reg.session_id)}>
                      Cancel
                    </Button>
                  </>
                )}
                {isPast && !ratedSessionIds.has(reg.session_id) && (
                  <Button variant="outline" className="flex-1" onClick={() => setRatingFor(reg)}>
                    <Star className="mr-2 h-4 w-4" />
                    Rate session
                  </Button>
                )}
                {isPast && ratedSessionIds.has(reg.session_id) && (
                  <p className="text-sm text-muted-foreground">Feedback submitted</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!ratingFor} onOpenChange={(open) => !open && setRatingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate "{ratingFor?.session?.title}"</DialogTitle>
            <DialogDescription>Your feedback helps mentors improve.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value > 1 ? "s" : ""}`}
                onClick={() => setRating(value)}
                className="p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star className={`h-7 w-7 ${value <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="What went well? What could be better? (optional)"
            value={feedbackText}
            maxLength={1000}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <Button onClick={submitFeedback} disabled={rating < 1}>Submit feedback</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
