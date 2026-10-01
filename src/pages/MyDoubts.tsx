import { useEffect, useState } from "react";
import { Bot, Loader2, UserCheck } from "lucide-react";
import StudentLayout from "@/components/dashboard/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DoubtRow {
  id: string;
  question: string;
  subject: string;
  ai_answer: string | null;
  status: string;
  mentor_answer: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

/** Full history of the student's AI doubts and mentor follow-ups. */
export default function MyDoubts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [doubts, setDoubts] = useState<DoubtRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const load = async (offset = 0) => {
    if (!user) return;
    const { data } = await supabase
      .from("doubts")
      .select("id, question, subject, ai_answer, status, mentor_answer, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    const rows = data ?? [];
    setDoubts((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const escalate = async (id: string) => {
    const { error } = await supabase.rpc("escalate_doubt", { _doubt_id: id });
    if (error) {
      toast({ title: "Could not send to a mentor", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sent to a mentor" });
    setDoubts((ds) => ds.map((d) => (d.id === id ? { ...d, status: "escalated" } : d)));
  };

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        <h1 className="text-3xl font-bold">My Doubts</h1>
        {loading ? (
          <div className="flex justify-center py-16" role="status" aria-label="Loading"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : doubts.length === 0 ? (
          <p className="text-muted-foreground">You haven't asked any doubts yet. Ask one from your dashboard.</p>
        ) : (
          doubts.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <button type="button" className="text-left" onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={open === d.id}>
                  <CardTitle className="text-base">{d.question}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground items-center">
                    <Badge variant="outline">{d.subject}</Badge>
                    <Badge variant={d.status === "mentor_answered" ? "default" : "secondary"}>
                      {d.status === "answered" ? "AI answered" : d.status === "escalated" ? "Waiting for mentor" : "Mentor answered"}
                    </Badge>
                    <span>{new Date(d.created_at).toLocaleString()}</span>
                  </div>
                </button>
              </CardHeader>
              {open === d.id && (
                <CardContent className="space-y-3">
                  {d.ai_answer && (
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2 mb-1"><Bot className="h-4 w-4" /> AI answer</p>
                      <Markdown source={d.ai_answer} className="text-sm" />
                    </div>
                  )}
                  {d.mentor_answer && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium flex items-center gap-2 mb-1"><UserCheck className="h-4 w-4" /> Mentor's answer</p>
                      <Markdown source={d.mentor_answer} className="text-sm" />
                    </div>
                  )}
                  {d.status === "answered" && (
                    <Button size="sm" variant="outline" onClick={() => escalate(d.id)}>
                      <UserCheck className="h-4 w-4 mr-1" /> Ask a mentor
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
        {hasMore && <Button variant="outline" onClick={() => load(doubts.length)}>Load more</Button>}
      </div>
    </StudentLayout>
  );
}
