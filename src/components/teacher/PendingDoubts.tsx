import { useState, useEffect } from "react";
import { MessageSquare, Clock, Reply, User, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Doubt {
  id: string;
  studentName: string;
  subject: string;
  question: string;
  askedAt: string;
  priority: "high" | "medium" | "low";
}

const getPriorityColor = (priority: Doubt["priority"]) => {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
  }
};

const getPriorityFromTime = (createdAt: string): "high" | "medium" | "low" => {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) return "high";
  if (hoursAgo < 6) return "medium";
  return "low";
};

export default function PendingDoubts() {
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoubts();
  }, []);

  const fetchDoubts = async () => {
    try {
      // Fetch forum threads with no replies (pending doubts)
      const { data: threadsData, error } = await supabase
        .from("forum_threads")
        .select(`
          id,
          title,
          content,
          created_at,
          author_id,
          category_id,
          forum_categories(name)
        `)
        .eq("reply_count", 0)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set((threadsData || []).map(t => t.author_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", authorIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const transformedDoubts: Doubt[] = (threadsData || []).map((thread) => {
        const profile = profilesMap.get(thread.author_id);
        const category = thread.forum_categories as { name: string } | null;
        
        return {
          id: thread.id,
          studentName: profile?.full_name || profile?.email?.split("@")[0] || "Anonymous",
          subject: category?.name || "General",
          question: thread.title,
          askedAt: formatDistanceToNow(new Date(thread.created_at), { addSuffix: true }),
          priority: getPriorityFromTime(thread.created_at),
        };
      });

      setDoubts(transformedDoubts);
    } catch (error) {
      console.error("Error fetching doubts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Pending Doubts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Pending Doubts
          </span>
          <Badge variant="outline">{doubts.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          {doubts.length > 0 ? (
            <div className="space-y-3">
              {doubts.map((doubt) => (
                <div
                  key={doubt.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{doubt.studentName}</span>
                    </div>
                    <Badge variant={getPriorityColor(doubt.priority)} className="text-xs">
                      {doubt.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {doubt.question}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {doubt.subject}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {doubt.askedAt}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <Reply className="h-3 w-3" />
                      Reply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No pending doubts</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
