import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ContinueLesson } from "@/hooks/useStudentDashboard";

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The student's real most-recently-opened, unfinished lesson — never a placeholder. */
export default function ContinueLearningWidget({ lesson, grade }: { lesson: ContinueLesson | null; grade: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
        <h3 className="font-semibold">{lesson ? "Continue Learning" : "Start Learning"}</h3>
      </div>

      {!lesson ? (
        <div className="text-sm text-muted-foreground space-y-3">
          <p>You haven't started a course yet.</p>
          <Button asChild size="sm"><Link to="/my-courses">Browse Courses</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="font-medium">{lesson.subject_name} — {lesson.lesson_title}</p>
            {lesson.chapter_title && <p className="text-xs text-muted-foreground">{lesson.chapter_title}</p>}
          </div>
          {lesson.position_in_chapter && lesson.chapter_lesson_count && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Lesson {lesson.position_in_chapter} of {lesson.chapter_lesson_count}</span>
                <span>{Math.round((lesson.position_in_chapter / lesson.chapter_lesson_count) * 100)}%</span>
              </div>
              <Progress value={(lesson.position_in_chapter / lesson.chapter_lesson_count) * 100} className="h-1.5" />
            </div>
          )}
          <p className="text-xs text-muted-foreground">Last opened: {timeAgo(lesson.last_viewed_at)}</p>
          <Button asChild size="sm"><Link to={lesson.subject_id ? `/my-courses/${lesson.subject_id}/_/${lesson.lesson_id}` : "/my-courses"}>Continue</Link></Button>
        </div>
      )}
    </Card>
  );
}
