import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";
import { youtubeEmbedUrl } from "@/lib/video";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  content_md: string;
  video_url: string | null;
  duration_minutes: number;
  status: string;
  chapter: { id: string; title: string; subject: { id: string; name: string; class_level: number } | null } | null;
}

export default function LessonView() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [nextLessonId, setNextLessonId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, summary, content_md, video_url, duration_minutes, status, chapter_id, sort_order, chapter:chapters(id, title, subject:subjects(id, name, class_level))")
        .eq("id", lessonId)
        .maybeSingle();
      if (cancelled) return;
      setLesson(data as Lesson | null);

      if (data) {
        const { data: siblings } = await supabase
          .from("lessons")
          .select("id, sort_order")
          .eq("chapter_id", data.chapter_id)
          .eq("status", "published")
          .gt("sort_order", data.sort_order)
          .order("sort_order")
          .limit(1);
        if (!cancelled) setNextLessonId(siblings?.[0]?.id ?? null);

        if (user && data.status === "published") {
          const { data: recorded } = await supabase.rpc("record_lesson_progress", { _lesson_id: data.id });
          if (!cancelled) setStatus(recorded ?? null);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, user]);

  const markComplete = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/lessons/${lessonId}` } });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("record_lesson_progress", { _lesson_id: lessonId!, _completed: true });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save progress", variant: "destructive" });
      return;
    }
    setStatus(data);
    toast({ title: "Lesson completed", description: "+10 XP" });
  };

  useDocumentMeta({
    title: lesson?.title ?? "Lesson",
    description: lesson?.summary ?? undefined,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
          <Button asChild><Link to="/courses">Back to courses</Link></Button>
        </main>
      </div>
    );
  }

  const embed = youtubeEmbedUrl(lesson.video_url);
  const subject = lesson.chapter?.subject;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {subject && (
          <Link to={`/courses/${subject.id}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> {subject.name} • {lesson.chapter?.title}
          </Link>
        )}

        <div>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          {lesson.summary && <p className="text-muted-foreground mt-2">{lesson.summary}</p>}
          {lesson.status !== "published" && <p className="text-sm text-orange-600 mt-2">Draft — only you can see this lesson.</p>}
        </div>

        {embed && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border">
            <iframe
              src={embed}
              title={lesson.title}
              className="h-full w-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}
        {!embed && lesson.video_url && (
          <Button asChild variant="outline">
            <a href={lesson.video_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Watch the lesson video
            </a>
          </Button>
        )}

        {lesson.content_md.trim() && (
          <Card>
            <CardContent className="pt-6">
              <Markdown source={lesson.content_md} />
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {status === "completed" ? (
            <span className="inline-flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
              <CheckCircle2 className="h-5 w-5" /> Completed
            </span>
          ) : (
            lesson.status === "published" && (
              <Button onClick={markComplete} disabled={saving}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as complete
              </Button>
            )
          )}
          {nextLessonId && (
            <Button asChild variant="outline">
              <Link to={`/lessons/${nextLessonId}`}>Next lesson</Link>
            </Button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
