import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2, Users } from "lucide-react";
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

interface Club {
  id: string;
  name: string;
  description: string | null;
  category: string;
  member_count: number | null;
  created_by: string | null;
}

interface Post {
  id: string;
  author_id: string;
  content: string;
  created_at: string | null;
}

export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isModerator } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const { data: clubData } = await supabase
      .from("student_clubs")
      .select("id, name, description, category, member_count, created_by")
      .eq("id", id)
      .maybeSingle();
    setClub(clubData);

    let member = false;
    if (user) {
      const { data } = await supabase.from("club_members").select("id").eq("club_id", id).eq("user_id", user.id).maybeSingle();
      member = !!data;
    }
    setIsMember(member);

    // RLS only returns posts to members.
    const { data: postRows } = await supabase
      .from("club_posts")
      .select("id, author_id, content, created_at")
      .eq("club_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    setPosts(postRows || []);

    const authorIds = [...new Set((postRows || []).map((p) => p.author_id))];
    if (authorIds.length) {
      const { data } = await supabase.from("public_profiles").select("id, full_name").in("id", authorIds);
      setNames(Object.fromEntries((data || []).map((p) => [p.id, p.full_name || "Student"])));
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const join = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/community/club/${id}` } });
      return;
    }
    const { error } = await supabase.from("club_members").insert({ club_id: id!, user_id: user.id });
    if (error) toast({ title: "Could not join club", variant: "destructive" });
    else load();
  };

  const leave = async () => {
    if (!user) return;
    const { error } = await supabase.from("club_members").delete().eq("club_id", id!).eq("user_id", user.id);
    if (!error) load();
  };

  const post = async () => {
    if (!user || !draft.trim()) return;
    const { error } = await supabase.from("club_posts").insert({ club_id: id!, author_id: user.id, content: draft.trim() });
    if (error) {
      toast({ title: "Could not post", variant: "destructive" });
      return;
    }
    setDraft("");
    load();
  };

  const removePost = async (postId: string) => {
    if (!window.confirm("Delete this post?")) return;
    const { error } = await supabase.from("club_posts").delete().eq("id", postId);
    if (!error) load();
  };

  useDocumentMeta({
    title: club?.name ?? "Club",
    description: club?.description ?? undefined,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Club not found</h1>
          <Button asChild><Link to="/community">Back to community</Link></Button>
        </main>
      </div>
    );
  }

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
              <div>
                <CardTitle className="text-2xl">{club.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{club.category}</Badge>
                  <Users className="h-4 w-4" /> {club.member_count ?? 0} members
                </CardDescription>
              </div>
              {isMember ? (
                club.created_by !== user?.id && <Button variant="outline" onClick={leave}>Leave</Button>
              ) : (
                <Button onClick={join}>Join club</Button>
              )}
            </div>
          </CardHeader>
          {club.description && (
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{club.description}</p>
              <div className="mt-3"><ReportDialog contentLink={`/community/club/${club.id}`} /></div>
            </CardContent>
          )}
        </Card>

        {isMember ? (
          <>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <label htmlFor="post" className="text-sm font-medium">Share with the club</label>
                <Textarea id="post" value={draft} maxLength={5000} onChange={(e) => setDraft(e.target.value)} />
                <Button onClick={post} disabled={!draft.trim()}>Post</Button>
              </CardContent>
            </Card>
            {posts.length === 0 && <p className="text-center text-muted-foreground">No posts yet — start the conversation!</p>}
            {posts.map((p) => (
              <Card key={p.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{names[p.author_id] || "Student"}</span>
                    {p.created_at && <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{p.content}</p>
                  <div className="flex gap-2 mt-2">
                    <ReportDialog contentLink={`/community/club/${club.id}#post-${p.id}`} />
                    {(p.author_id === user?.id || isAdmin || isModerator) && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removePost(p.id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <p className="text-center text-muted-foreground">Join the club to see and share posts.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
