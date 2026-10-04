import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Megaphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Row {
  id: string;
  title: string;
  body: string;
  teacher_name: string;
  publish_at: string;
}

/**
 * Announcements teachers addressed to this student (get_my_announcements
 * only returns published, due announcements for the caller). Renders
 * nothing when there are none, so it never adds an empty card.
 */
export default function TeacherAnnouncementsCard() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["dashboard", "announcements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_announcements", { _limit: 5 });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: !!user,
  });

  if (!data || data.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Megaphone className="h-5 w-5 text-primary" aria-hidden="true" />
        From your teachers
      </h2>
      <ul className="space-y-3">
        {data.map((a) => (
          <li key={a.id} className="rounded-lg border border-border p-3">
            <p className="font-semibold">{a.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{a.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {a.teacher_name} · {formatDistanceToNow(new Date(a.publish_at), { addSuffix: true })}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
