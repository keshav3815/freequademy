import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  subjects: { status: string; lesson_count: number; lessons_completed: number }[];
  testsAttempted: number;
  testsPublished: number;
  activeDaysLast30: number;
}

function Row({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} / {total}</span>
      </div>
      <Progress value={pct} className="h-1.5" aria-label={`${label}: ${value} of ${total}`} />
    </div>
  );
}

/** "Overall Learning Progress" — courses/lessons/tests/study days, real counts only. */
export default function OverallProgressCard({ subjects, testsAttempted, testsPublished, activeDaysLast30 }: Props) {
  const completed = subjects.filter((s) => s.status === "completed").length;
  const totalLessons = subjects.reduce((sum, s) => sum + s.lesson_count, 0);
  const completedLessons = subjects.reduce((sum, s) => sum + s.lessons_completed, 0);
  const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
        <h3 className="font-semibold">Overall Learning Progress</h3>
      </div>
      <p className="text-4xl font-bold mb-4" aria-hidden="true">{overallPct}%</p>
      <span className="sr-only">{overallPct}% overall lesson completion across all subjects</span>
      <div className="space-y-3">
        <Row label="Courses completed" value={completed} total={subjects.length} />
        <Row label="Lessons" value={completedLessons} total={totalLessons} />
        <Row label="Tests attempted" value={testsAttempted} total={Math.max(testsPublished, testsAttempted)} />
        <Row label="Active days (last 30)" value={activeDaysLast30} total={30} />
      </div>
    </Card>
  );
}
