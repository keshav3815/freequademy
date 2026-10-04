import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TestReviewList from "@/components/learn/TestReviewList";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import type { Database } from "@/integrations/supabase/types";

type ReviewRow = Database["public"]["Functions"]["get_attempt_review"]["Returns"][number];
interface Attempt { score: number | null; max_score: number | null; percentage: number | null; test: { title: string; subject_id: string } | null }

/**
 * Read-only review of a past submitted attempt — the "Review" link from the
 * dashboard's recent-results table. get_attempt_review only returns rows for
 * the caller's own submitted attempts (see supabase/tests/database/010),
 * so this page can never show another student's answers.
 */
export default function AttemptReview() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [review, setReview] = useState<ReviewRow[]>([]);
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [teacherReview, setTeacherReview] = useState<{ feedback: string | null; reviewed_at: string } | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const [{ data: attemptData, error: attemptError }, { data: reviewData, error: reviewError }, { data: teacherData }] = await Promise.all([
        supabase.from("test_attempts").select("score, max_score, percentage, test:tests(title, subject_id)").eq("id", attemptId).eq("status", "submitted").maybeSingle(),
        supabase.rpc("get_attempt_review", { _attempt_id: attemptId }),
        // teacher feedback is optional; RLS only returns it for the attempt's own student
        supabase.from("attempt_reviews").select("feedback, reviewed_at").eq("attempt_id", attemptId).maybeSingle(),
      ]);
      if (attemptError || reviewError || !attemptData) {
        setPhase("error");
        return;
      }
      setAttempt(attemptData as Attempt);
      setReview(reviewData ?? []);
      setTeacherReview(teacherData ?? null);
      setPhase("done");
    })();
  }, [attemptId]);

  useDocumentMeta({ title: attempt?.test?.title ? `Review — ${attempt.test.title}` : "Test review" });

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "error" || !attempt) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Review not available</h1>
          <p className="text-muted-foreground mb-4">This attempt doesn't exist, isn't submitted yet, or isn't yours.</p>
          <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{attempt.test?.title ?? "Test"}</CardTitle>
            <CardDescription>Your result</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-4xl font-bold">{Number(attempt.percentage)}%</p>
            <p className="text-muted-foreground">{attempt.score} / {attempt.max_score} marks</p>
            {attempt.test?.subject_id && (
              <Button asChild variant="outline"><Link to={`/my-courses/${attempt.test.subject_id}`}>Back to course</Link></Button>
            )}
          </CardContent>
        </Card>
        {teacherReview?.feedback && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feedback from your teacher</CardTitle>
              <CardDescription>{new Date(teacherReview.reviewed_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{teacherReview.feedback}</p>
            </CardContent>
          </Card>
        )}
        <h2 className="text-xl font-semibold">Review</h2>
        <TestReviewList review={review} />
      </main>
      <Footer />
    </div>
  );
}
