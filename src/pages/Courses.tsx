import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Book, ClipboardCheck, Loader2, PlayCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type SubjectProgress = Database["public"]["Functions"]["get_subject_progress"]["Returns"][number];

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];
const SUBJECT_COLORS = [
  "from-blue-400 to-blue-600",
  "from-green-400 to-green-600",
  "from-purple-400 to-purple-600",
  "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",
  "from-cyan-400 to-cyan-600",
];

export default function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isMentor } = useAuth();
  const studentGrade = !isMentor && profile?.grade && GRADES.includes(profile.grade) ? profile.grade : null;
  const selectedClass = searchParams.get("class") ?? studentGrade ?? "10";
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    supabase
      .rpc("get_subject_progress", { _class_level: Number(selectedClass) })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(true);
        setSubjects(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  useDocumentMeta({
    title: `Class ${selectedClass} Courses`,
    description: `Free Class ${selectedClass} lessons and practice tests, organised by subject and chapter.`,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Class <span className="bg-gradient-primary bg-clip-text text-transparent">{selectedClass}</span> Courses
              </h1>
              <p className="text-muted-foreground">Every lesson and practice test is free.</p>
            </div>

            <Select value={selectedClass} onValueChange={(value) => setSearchParams({ class: value })}>
              <SelectTrigger className="w-[180px]" aria-label="Select class">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    Class {cls}{cls === studentGrade ? " (yours)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20" role="status" aria-label="Loading courses">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-center text-muted-foreground py-20">Courses could not be loaded. Please try again.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject, index) => {
                const pct = subject.lesson_count > 0 ? Math.round((subject.lessons_completed / subject.lesson_count) * 100) : 0;
                const hasContent = subject.lesson_count > 0 || subject.test_count > 0;
                return (
                  <Card key={subject.subject_id} className="overflow-hidden hover:shadow-xl transition-shadow">
                    <div className={`h-28 bg-gradient-to-br ${SUBJECT_COLORS[index % SUBJECT_COLORS.length]} relative`}>
                      <div className="absolute inset-0 bg-black/20" />
                      <h2 className="absolute bottom-4 left-4 text-2xl font-bold text-white">{subject.subject_name}</h2>
                      {!hasContent && (
                        <Badge variant="secondary" className="absolute top-4 right-4">Content coming soon</Badge>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Book className="h-4 w-4" />{subject.chapter_count} chapters</span>
                        <span className="flex items-center gap-1"><PlayCircle className="h-4 w-4" />{subject.lesson_count} lessons</span>
                        <span className="flex items-center gap-1"><ClipboardCheck className="h-4 w-4" />{subject.test_count} tests</span>
                      </div>
                      {subject.lesson_count > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{subject.lessons_completed} of {subject.lesson_count} lessons done</span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-2" aria-label={`${subject.subject_name} progress`} />
                        </div>
                      )}
                      <Button asChild variant={hasContent ? "gradient" : "outline"} className="w-full">
                        <Link to={`/courses/${subject.subject_id}`}>
                          {subject.lessons_completed > 0 ? "Continue learning" : "Open course"}
                        </Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
