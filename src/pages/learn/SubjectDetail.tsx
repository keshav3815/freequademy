import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Clock, Loader2, PlayCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface Subject { id: string; name: string; class_level: number }
interface Lesson { id: string; title: string; summary: string | null; duration_minutes: number; sort_order: number; chapter_id: string }
interface Chapter { id: string; title: string; description: string | null; sort_order: number; lessons: Lesson[] }
interface TestRow { id: string; title: string; difficulty: string; duration_minutes: number; test_type: string; chapter_id: string | null }

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const { user } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [bestScores, setBestScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    (async () => {
      const [subjectResult, chapterResult, testResult] = await Promise.all([
        supabase.from("subjects").select("id, name, class_level").eq("id", subjectId).maybeSingle(),
        supabase
          .from("chapters")
          .select("id, title, description, sort_order, lessons(id, title, summary, duration_minutes, sort_order, chapter_id, status)")
          .eq("subject_id", subjectId)
          .order("sort_order"),
        supabase
          .from("tests")
          .select("id, title, difficulty, duration_minutes, test_type, chapter_id")
          .eq("subject_id", subjectId)
          .eq("status", "published")
          .order("created_at"),
      ]);
      if (cancelled) return;

      setSubject(subjectResult.data);
      const chapterRows = (chapterResult.data ?? []).map((c) => ({
        ...c,
        lessons: (c.lessons ?? [])
          .filter((l) => l.status === "published")
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
      setChapters(chapterRows);
      setTests(testResult.data ?? []);

      if (user) {
        const lessonIds = chapterRows.flatMap((c) => c.lessons.map((l) => l.id));
        const testIds = (testResult.data ?? []).map((t) => t.id);
        const [progress, attempts] = await Promise.all([
          lessonIds.length
            ? supabase.from("lesson_progress").select("lesson_id").eq("status", "completed").in("lesson_id", lessonIds)
            : Promise.resolve({ data: [] as { lesson_id: string }[] }),
          testIds.length
            ? supabase.from("test_attempts").select("test_id, percentage").eq("status", "submitted").in("test_id", testIds)
            : Promise.resolve({ data: [] as { test_id: string; percentage: number | null }[] }),
        ]);
        if (cancelled) return;
        setCompleted(new Set((progress.data ?? []).map((p) => p.lesson_id)));
        const best: Record<string, number> = {};
        for (const a of attempts.data ?? []) {
          best[a.test_id] = Math.max(best[a.test_id] ?? 0, Number(a.percentage ?? 0));
        }
        setBestScores(best);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectId, user]);

  useDocumentMeta({
    title: subject ? `${subject.name} — Class ${subject.class_level}` : "Course",
    description: subject ? `Free Class ${subject.class_level} ${subject.name} lessons and practice tests on Freequademy.` : undefined,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Button asChild><Link to="/courses">Back to courses</Link></Button>
        </main>
      </div>
    );
  }

  const lessonTotal = chapters.reduce((n, c) => n + c.lessons.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Link to={`/courses?class=${subject.class_level}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> All Class {subject.class_level} courses
        </Link>

        <div>
          <h1 className="text-3xl md:text-4xl font-bold">{subject.name}</h1>
          <p className="text-muted-foreground mt-1">
            Class {subject.class_level} • {chapters.length} chapters • {lessonTotal} lessons • {tests.length} tests
            {user && lessonTotal > 0 && ` • ${completed.size} completed`}
          </p>
        </div>

        {chapters.length === 0 && tests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Lessons for this subject are being prepared by our mentors. Meanwhile, try the{" "}
              <Link to="/blog" className="text-primary underline">study notes</Link> or ask a doubt from your dashboard.
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {chapters.map((chapter, idx) => (
              <Card key={chapter.id}>
                <CardHeader>
                  <CardTitle className="text-lg">Chapter {idx + 1}: {chapter.title}</CardTitle>
                  {chapter.description && <CardDescription>{chapter.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-2">
                  {chapter.lessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No lessons yet.</p>
                  ) : (
                    chapter.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        to={`/lessons/${lesson.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          {completed.has(lesson.id) ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="Completed" />
                          ) : (
                            <PlayCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                          )}
                          <span>
                            <span className="font-medium block">{lesson.title}</span>
                            {lesson.summary && <span className="text-xs text-muted-foreground">{lesson.summary}</span>}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" /> {lesson.duration_minutes} min
                        </span>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Practice tests</h2>
            {tests.length === 0 && <p className="text-sm text-muted-foreground">No tests published yet.</p>}
            {tests.map((test) => (
              <Card key={test.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{test.title}</p>
                    <Badge variant="outline" className="capitalize shrink-0">{test.difficulty}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{test.duration_minutes} min • {test.test_type} test</p>
                  {bestScores[test.id] !== undefined && (
                    <p className="text-sm">Best score: <span className="font-semibold">{bestScores[test.id]}%</span></p>
                  )}
                  <Button asChild size="sm" className="w-full">
                    <Link to={`/tests/${test.id}`}>{bestScores[test.id] !== undefined ? "Retake" : "Start test"}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
