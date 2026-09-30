import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Clock, Loader2, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

interface TestRow {
  id: string;
  title: string;
  difficulty: string;
  duration_minutes: number;
  test_type: string;
  subject: { id: string; name: string; class_level: number } | null;
}

interface AttemptRow {
  id: string;
  test_id: string;
  percentage: number | null;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  test: { title: string } | null;
}

const difficultyVariant: Record<string, "secondary" | "outline" | "destructive"> = {
  easy: "secondary",
  medium: "outline",
  hard: "destructive",
};

export default function MockTests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, isMentor } = useAuth();
  const defaultGrade = !isMentor && profile?.grade && GRADES.includes(profile.grade) ? profile.grade : "10";
  const selectedClass = searchParams.get("class") ?? defaultGrade;
  const [tests, setTests] = useState<TestRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: subjects } = await supabase.from("subjects").select("id").eq("class_level", Number(selectedClass));
      const ids = (subjects ?? []).map((s) => s.id);
      const { data } = ids.length
        ? await supabase
            .from("tests")
            .select("id, title, difficulty, duration_minutes, test_type, subject:subjects(id, name, class_level)")
            .eq("status", "published")
            .in("subject_id", ids)
            .order("created_at", { ascending: false })
            .limit(100)
        : { data: [] };
      if (cancelled) return;
      setTests((data ?? []) as TestRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("test_attempts")
      .select("id, test_id, percentage, score, max_score, submitted_at, test:tests(title)")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setAttempts((data ?? []) as AttemptRow[]));
  }, [user]);

  const bestByTest = useMemo(() => {
    const best: Record<string, number> = {};
    for (const a of attempts) best[a.test_id] = Math.max(best[a.test_id] ?? 0, Number(a.percentage ?? 0));
    return best;
  }, [attempts]);

  useDocumentMeta({
    title: `Class ${selectedClass} Practice Tests`,
    description: `Free, instantly-scored practice tests for Class ${selectedClass}, with explanations for every question.`,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Practice Tests</h1>
            <p className="text-muted-foreground">Timed tests, scored instantly, with explanations for every answer.</p>
          </div>
          <Select value={selectedClass} onValueChange={(value) => setSearchParams({ class: value })}>
            <SelectTrigger className="w-[180px]" aria-label="Select class"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => <SelectItem key={g} value={g}>Class {g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="available">
          <TabsList>
            <TabsTrigger value="available">Available tests</TabsTrigger>
            {user && <TabsTrigger value="results">My results</TabsTrigger>}
          </TabsList>

          <TabsContent value="available" className="mt-6">
            {loading ? (
              <div className="flex justify-center py-16" role="status" aria-label="Loading tests"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : tests.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                No tests published for Class {selectedClass} yet. Mentors are adding new tests regularly.
              </CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                  <Card key={test.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{test.title}</CardTitle>
                        <Badge variant={difficultyVariant[test.difficulty] ?? "outline"} className="capitalize shrink-0">{test.difficulty}</Badge>
                      </div>
                      <CardDescription>{test.subject?.name} • {test.test_type} test</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" /> {test.duration_minutes} minutes</p>
                      {bestByTest[test.id] !== undefined && (
                        <p className="text-sm flex items-center gap-1"><Trophy className="h-4 w-4 text-yellow-600" /> Best: {bestByTest[test.id]}%</p>
                      )}
                      <Button asChild className="w-full">
                        <Link to={`/tests/${test.id}`}>
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          {bestByTest[test.id] !== undefined ? "Retake" : "Start test"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {user && (
            <TabsContent value="results" className="mt-6">
              {attempts.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">You haven't completed any tests yet.</p>
              ) : (
                <div className="space-y-3">
                  {attempts.map((a) => (
                    <Card key={a.id}>
                      <CardContent className="py-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{a.test?.title ?? "Test"}</p>
                          <p className="text-xs text-muted-foreground">{a.submitted_at && new Date(a.submitted_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{Number(a.percentage)}%</p>
                          <p className="text-xs text-muted-foreground">{a.score}/{a.max_score} marks</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
