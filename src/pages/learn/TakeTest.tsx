import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import TestReviewList from "@/components/learn/TestReviewList";
import { LEARNING_MODULES } from "@/lib/learningModules";
import freequademyLogo from "@/assets/freequademy-logo.png";

type ReviewRow = Database["public"]["Functions"]["get_attempt_review"]["Returns"][number];
type Result = Database["public"]["Functions"]["submit_test_attempt"]["Returns"][number];

interface Question { id: string; sort_order: number; prompt: string; options: string[]; marks: number }
interface TestInfo { id: string; title: string; description: string | null; duration_minutes: number; subject_id: string; test_type: string }

/**
 * Test flow: start (or resume) an attempt → answer (saved server-side on each
 * choice) → submit (scored in the database) → review with explanations.
 * Correct answers never reach the browser before submission.
 */
export default function TakeTest() {
  const { testId } = useParams();
  const { toast } = useToast();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [phase, setPhase] = useState<"loading" | "intro" | "taking" | "submitting" | "done" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [review, setReview] = useState<ReviewRow[]>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!testId) return;
    (async () => {
      const [testResult, questionResult] = await Promise.all([
        supabase.from("tests").select("id, title, description, duration_minutes, subject_id, test_type").eq("id", testId).maybeSingle(),
        supabase.from("test_questions").select("id, sort_order, prompt, options, marks").eq("test_id", testId).order("sort_order").order("created_at"),
      ]);
      if (!testResult.data) {
        setErrorMessage("This test could not be found.");
        setPhase("error");
        return;
      }
      setTest(testResult.data);
      setQuestions((questionResult.data ?? []).map((q) => ({ ...q, options: (q.options as string[]) ?? [] })));
      setPhase("intro");
    })();
  }, [testId]);

  const start = async () => {
    const { data: id, error } = await supabase.rpc("start_test_attempt", { _test_id: testId! });
    if (error || !id) {
      setErrorMessage(error?.message ?? "Could not start the test.");
      setPhase("error");
      return;
    }
    const [{ data: attempt }, { data: saved }] = await Promise.all([
      supabase.from("test_attempts").select("deadline_at").eq("id", id).single(),
      supabase.from("attempt_answers").select("question_id, selected_option").eq("attempt_id", id),
    ]);
    setAttemptId(id);
    setDeadline(attempt ? new Date(attempt.deadline_at) : null);
    setAnswers(Object.fromEntries((saved ?? []).filter((a) => a.selected_option !== null).map((a) => [a.question_id, a.selected_option as number])));
    setPhase("taking");
  };

  const submit = useCallback(async () => {
    if (!attemptId || submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    const { data, error } = await supabase.rpc("submit_test_attempt", { _attempt_id: attemptId });
    if (error || !data?.[0]) {
      submittedRef.current = false;
      toast({ title: "Could not submit", description: "Please try again.", variant: "destructive" });
      setPhase("taking");
      return;
    }
    setResult(data[0]);
    const { data: reviewRows } = await supabase.rpc("get_attempt_review", { _attempt_id: attemptId });
    setReview(reviewRows ?? []);
    setPhase("done");
  }, [attemptId, toast]);

  // countdown + auto-submit at the deadline
  useEffect(() => {
    if (phase !== "taking" || !deadline) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= deadline.getTime()) submit();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, deadline, submit]);

  const choose = async (questionId: string, option: number) => {
    const previous = answers[questionId];
    setAnswers((a) => ({ ...a, [questionId]: option }));
    const { error } = await supabase.rpc("save_test_answer", {
      _attempt_id: attemptId!,
      _question_id: questionId,
      _selected_option: option,
    });
    if (error) {
      setAnswers((a) => {
        const next = { ...a };
        if (previous === undefined) delete next[questionId];
        else next[questionId] = previous;
        return next;
      });
      toast({ title: "Answer not saved", description: error.message, variant: "destructive" });
    }
  };

  const remaining = deadline ? Math.max(0, Math.floor((deadline.getTime() - now) / 1000)) : 0;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const workspace = test?.test_type === "practice" ? LEARNING_MODULES.quizzes : LEARNING_MODULES["test-series"];

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {test && (
          <Link to={workspace.basePath} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to {workspace.title}
          </Link>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );

  if (phase === "loading") {
    return shell(
      <div className="flex justify-center py-20" role="status" aria-label="Loading"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>,
    );
  }

  if (phase === "error") {
    return shell(
      <Card><CardContent className="py-12 text-center space-y-4">
        <p>{errorMessage}</p>
        <Button asChild variant="outline"><Link to="/tests">All tests</Link></Button>
      </CardContent></Card>,
    );
  }

  if (phase === "intro" && test) {
    return shell(
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{test.title}</CardTitle>
          {test.description && <CardDescription>{test.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {questions.length} questions • {test.duration_minutes} minutes. Your answers are saved as you go, and the test
            is submitted automatically when time runs out.
          </p>
          <Button onClick={start} disabled={questions.length === 0}>
            {questions.length === 0 ? "No questions yet" : "Start test"}
          </Button>
        </CardContent>
      </Card>,
    );
  }

  if (phase === "done" && result) {
    return shell(
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Your result</CardTitle>
            <CardDescription>{test?.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-4xl font-bold">{Number(result.percentage)}%</p>
            <p className="text-muted-foreground">
              {result.score} / {result.max_score} marks • {result.correct_count} of {result.question_count} correct
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link to={workspace.basePath}>More {workspace.itemNoun.many}</Link></Button>
              <Button asChild variant="outline"><Link to={`/my-courses/${test?.subject_id}`}>Back to course</Link></Button>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold">Review</h2>
        <TestReviewList review={review} />
      </>,
    );
  }

  const question = questions[current];
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const confirmAndSubmit = () => {
    if (answeredCount < questions.length && !window.confirm(`${questions.length - answeredCount} question(s) unanswered. Submit anyway?`)) return;
    submit();
  };

  // Focused exam layout: no site navigation while the clock is running.
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <img src={freequademyLogo} alt="Freequademy" className="h-7 w-7 object-contain shrink-0" />
          <span className="font-medium truncate">{test?.title}</span>
        </div>
        <span
          className={`flex items-center gap-1.5 font-mono text-sm shrink-0 ${remaining < 60 ? "text-red-600" : ""}`}
          aria-live="polite"
          aria-label={`Time remaining ${minutes} minutes ${seconds} seconds`}
        >
          <Clock className="h-4 w-4" aria-hidden="true" /> {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-4 md:order-first order-last">
          <nav aria-label="Question navigator">
            <p className="text-sm font-medium mb-2">Questions</p>
            <ol className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => {
                const answered = answers[q.id] !== undefined;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => setCurrent(i)}
                      aria-label={`Question ${i + 1}${answered ? ", answered" : ""}`}
                      aria-current={i === current ? "step" : undefined}
                      className={`h-9 w-full rounded-md border text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        i === current
                          ? "border-primary ring-1 ring-primary"
                          : "border-border"
                      } ${answered ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                    >
                      {i + 1}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <p className="text-sm text-muted-foreground">{answeredCount}/{questions.length} answered</p>
          <Button variant="success" className="w-full" disabled={phase === "submitting"} onClick={confirmAndSubmit}>
            Submit test
          </Button>
        </aside>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Question {current + 1} of {questions.length}</CardTitle>
            <Progress value={((current + 1) / questions.length) * 100} className="h-2" aria-label="Test progress" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">{question.prompt}</p>
            <div className="space-y-2" role="radiogroup" aria-label="Answer options">
              {question.options.map((option, i) => {
                const selected = answers[question.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={phase === "submitting"}
                    onClick={() => choose(question.id, i)}
                    className={`w-full text-left rounded-lg border-2 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                  >
                    {String.fromCharCode(65 + i)}. {option}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Previous</Button>
              <Button disabled={current >= questions.length - 1} onClick={() => setCurrent((c) => c + 1)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
