import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Item {
  id: string;
  title: string;
  when: Date;
  kind: "session" | "event";
}

/** The student's registered mentorship sessions and community events. */
export default function UpcomingSchedule(_props: { grade: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const now = new Date().toISOString();
    Promise.all([
      supabase
        .from("session_participants")
        .select("session:mentorship_sessions(id, title, scheduled_at, status)")
        .eq("student_id", user.id)
        .in("status", ["registered", "attended"]),
      supabase
        .from("event_registrations")
        .select("event:community_events(id, title, scheduled_at)")
        .eq("user_id", user.id),
    ]).then(([sessions, events]) => {
      const list: Item[] = [
        ...(sessions.data ?? [])
          .map((r) => r.session)
          .filter((s): s is NonNullable<typeof s> => !!s && s.status === "scheduled" && s.scheduled_at >= now)
          .map((s) => ({ id: s.id, title: s.title, when: new Date(s.scheduled_at), kind: "session" as const })),
        ...(events.data ?? [])
          .map((r) => r.event)
          .filter((e): e is NonNullable<typeof e> => !!e && e.scheduled_at >= now)
          .map((e) => ({ id: e.id, title: e.title, when: new Date(e.scheduled_at), kind: "event" as const })),
      ].sort((a, b) => a.when.getTime() - b.when.getTime());
      setItems(list.slice(0, 5));
      setLoaded(true);
    });
  }, [user]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
        <h3 className="font-semibold">Upcoming</h3>
      </div>
      {loaded && items.length === 0 ? (
        <div className="text-sm text-muted-foreground space-y-3">
          <p>Nothing scheduled. Join a mentorship session or a live event.</p>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/mentorship">Sessions</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/community">Events</Link></Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 rounded-lg border p-3">
              {item.kind === "session" ? <Video className="h-4 w-4 text-primary shrink-0" aria-hidden="true" /> : <Users className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{item.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.when.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} •{" "}
                  {item.when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
