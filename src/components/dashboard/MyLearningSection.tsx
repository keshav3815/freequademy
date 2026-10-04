import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SubjectProgressRow as SubjectRow } from "@/hooks/dashboardTypes";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "not_started", label: "Not Started" },
] as const;

function timeAgo(iso: string | null): string {
  if (!iso) return "Not started";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const STATUS_ICON = {
  completed: CheckCircle2,
  in_progress: PlayCircle,
  not_started: Circle,
} as const;

/**
 * "My Learning": one card per subject ("course" in this product — there is
 * no separate courses/enrollments table; a subject *is* the learnable unit,
 * and every student in a class has all of that class's subjects, so there is
 * no opt-in enrollment step to model either). Real lesson/test counts and a
 * real "last studied" timestamp, from get_subject_progress (extended in the
 * analytics migration with `status` and `last_activity_at`).
 */
export default function MyLearningSection({ subjects, grade }: { subjects: SubjectRow[]; grade: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const filtered = filter === "all" ? subjects : subjects.filter((s) => s.status === filter);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
          <h3 className="font-semibold">My Learning</h3>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="text-xs">
                {f.label}
                {f.value !== "all" && ` (${subjects.filter((s) => s.status === f.value).length})`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {subjects.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10 space-y-3">
          <p>No subjects published for Class {grade} yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No subjects in this category.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const pct = s.lesson_count > 0 ? Math.round((s.lessons_completed / s.lesson_count) * 100) : 0;
            const StatusIcon = STATUS_ICON[s.status as keyof typeof STATUS_ICON] ?? Circle;
            return (
              <div key={s.subject_id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.subject_name}</p>
                    <p className="text-xs text-muted-foreground">{s.chapter_count} chapter{s.chapter_count === 1 ? "" : "s"}</p>
                  </div>
                  <StatusIcon
                    className={`h-4 w-4 shrink-0 ${s.status === "completed" ? "text-green-600" : s.status === "in_progress" ? "text-primary" : "text-muted-foreground"}`}
                    aria-label={s.status.replace("_", " ")}
                  />
                </div>
                <div>
                  <Progress value={pct} className="h-1.5" aria-label={`${s.subject_name}: ${pct}% complete`} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.lessons_completed} / {s.lesson_count} lessons
                    {s.average_score !== null && ` • ${s.average_score}% avg`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Last studied: {timeAgo(s.last_activity_at)}</p>
                <Button asChild size="sm" variant={s.status === "not_started" ? "default" : "outline"} className="w-full">
                  <Link to={`/my-courses/${s.slug}`}>
                    {s.status === "completed" ? "Review" : s.status === "in_progress" ? "Continue Learning" : "Start"}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
