import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Pin, ThumbsUp, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReportDialog from "@/components/community/ReportDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface Thread {
  id: string;
  title: string;
  content: string;
  author_id: string;
  upvotes: number | null;
  reply_count: number | null;
  is_pinned: boolean | null;
  created_at: string | null;
}

interface Reply {
  id: string;
  content: string;
  author_id: string;
  upvotes: number | null;
  is_solution: boolean | null;
  created_at: string | null;
}

export default function ThreadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isModerator } = useAuth();
  const canModerate = isAdmin || isModerator;
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [threadResult, repliesResult] = await Promise.all([
      supabase.from("forum_threads").select("id, title, content, author_id, upvotes, reply_count, is_pinned, created_at").eq("id", id).maybeSingle(),
      supabase.from("forum_replies").select("id, content, author_id, upvotes, is_solution, created_at").eq("thread_id", id).order("created_at").limit(200),
    ]);
    setThread(threadResult.data);
    const replyRows = repliesResult.data || [];
    setReplies(replyRows);

    const authorIds = [...new Set([threadResult.data?.author_id, ...replyRows.map((r) => r.author_id)].filter(Boolean))] as string[];
    if (authorIds.length) {
      const { data } = await supabase.from("public_profiles").select("id, full_name").in("id", authorIds);
      setNames(Object.fromEntries((data || []).map((p) => [p.id, p.full_name || "Student"])));
    }
    if (user) {
      const { data } = await supabase.from("thread_votes").select("id").eq("thread_id", id).eq("user_id", user.id).maybeSingle();
      setVoted(!!data);
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const requireLogin = () => {
    toast({ title: "Please log in to take part" });
    navigate("/login", { state: { from: `/community/thread/${id}` } });
  };

  const toggleVote = async () => {
    if (!user) return requireLogin();
    const { error } = voted
      ? await supabase.from("thread_votes").delete().eq("thread_id", id!).eq("user_id", user.id)
      : await supabase.from("thread_votes").insert({ thread_id: id!, user_id: user.id });
    if (!error) load();
  };

  const postReply = async () => {
    if (!user) return requireLogin();
    if (!reply.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("forum_replies").insert({ thread_id: id!, author_id: user.id, content: reply.trim() });
    setPosting(false);
    if (error) {
      toast({ title: "Could not post reply", variant: "destructive" });
      return;
    }
    setReply("");
    load();
  };

  const markSolution = async (replyId: string) => {
    const { error } = await supabase.rpc("mark_reply_solution", { _reply_id: replyId });
    if (error) toast({ title: "Could not mark solution", variant: "destructive" });
    else load();
  };

  const togglePin = async () => {
    const { error } = await supabase.rpc("set_thread_pinned", { _thread_id: id!, _pinned: !thread?.is_pinned });
    if (!error) load();
  };

  const deleteThread = async () => {
    if (!window.confirm("Delete this discussion?")) return;
    const { error } = await supabase.from("forum_threads").delete().eq("id", id!);
    if (error) toast({ title: "Could not delete", variant: "destructive" });
    else navigate("/community", { replace: true });
  };

  const deleteReply = async (replyId: string) => {
    if (!window.confirm("Delete this reply?")) return;
    const { error } = await supabase.from("forum_replies").delete().eq("id", replyId);
    if (!error) load();
  };

  useDocumentMeta({
    title: thread?.title ?? "Discussion",
    description: thread?.content ? thread.content.slice(0, 155) : undefined,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Discussion not found</h1>
          <Button asChild><Link to="/community">Back to community</Link></Button>
        </main>
      </div>
    );
  }

  const isThreadAuthor = user?.id === thread.author_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Link to="/community" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to community
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-2xl">
                {thread.is_pinned && <Pin className="inline h-5 w-5 mr-2 text-primary" aria-label="Pinned" />}
                {thread.title}
              </CardTitle>
              <Button variant={voted ? "default" : "outline"} size="sm" onClick={toggleVote} aria-pressed={voted} aria-label={`Upvote (${thread.upvotes ?? 0} votes)`}>
                <ThumbsUp className="h-4 w-4 mr-1" /> {thread.upvotes ?? 0}
              </Button>
            </div>
            <CardDescription>
              By {names[thread.author_id] || "Student"}
              {thread.created_at && ` • ${new Date(thread.created_at).toLocaleDateString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{thread.content}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <ReportDialog contentLink={`/community/thread/${thread.id}`} />
              {canModerate && (
                <Button variant="ghost" size="sm" onClick={togglePin}>
                  <Pin className="h-4 w-4 mr-1" /> {thread.is_pinned ? "Unpin" : "Pin"}
                </Button>
              )}
              {(isThreadAuthor || canModerate) && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={deleteThread}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold">{replies.length} {replies.length === 1 ? "reply" : "replies"}</h2>

        {replies.map((r) => (
          <Card key={r.id} className={r.is_solution ? "border-green-600/50" : undefined}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium">{names[r.author_id] || "Student"}</span>
                {r.is_solution && (
                  <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" /> Solution</Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{r.content}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(isThreadAuthor || canModerate) && !r.is_solution && (
                  <Button variant="ghost" size="sm" onClick={() => markSolution(r.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark as solution
                  </Button>
                )}
                <ReportDialog contentLink={`/community/thread/${thread.id}#reply-${r.id}`} />
                {(user?.id === r.author_id || canModerate) && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteReply(r.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="pt-6 space-y-3">
            <label htmlFor="reply" className="text-sm font-medium">Your reply</label>
            <Textarea id="reply" value={reply} maxLength={5000} onChange={(e) => setReply(e.target.value)} placeholder={user ? "Write a helpful reply…" : "Log in to reply"} />
            <Button onClick={postReply} disabled={posting || (!!user && !reply.trim())}>
              {user ? "Post reply" : "Log in to reply"}
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
