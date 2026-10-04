import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bookmark, BookmarkCheck, CheckCircle2, CircleDot, Clock, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useToggleSaved } from "@/hooks/useLearningWorkspace";
import { TEST_CATEGORY_LABEL, type TestCategory } from "@/lib/learningModules";
import type { LessonItem, TestItem } from "@/lib/workspaceItems";

export function SaveButton({ kind, id, saved, title }: { kind: "lesson" | "test"; id: string; saved: boolean; title: string }) {
  const toggle = useToggleSaved();
  const { toast } = useToast();
  // Optimistic until the server confirms; the saved_items row stays the source of truth.
  const [pending, setPending] = useState<boolean | null>(null);
  useEffect(() => setPending(null), [saved]);
  const current = pending ?? saved;
  const Icon = current ? BookmarkCheck : Bookmark;
  const label = current ? `Remove ${title} from saved` : `Save ${title}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 transition-colors"
          aria-pressed={current}
          aria-label={label}
          disabled={toggle.isPending}
          onClick={() => {
            setPending(!current);
            toggle.mutate(
              { kind, id, saved: current },
              {
                onError: () => {
                  setPending(null);
                  toast({ title: "Could not update saved items", variant: "destructive" });
                },
              },
            );
          }}
        >
          <Icon className={current ? "h-4 w-4 text-primary fill-primary/20" : "h-4 w-4"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{current ? "Saved — click to remove" : "Save for later"}</TooltipContent>
    </Tooltip>
  );
}

interface Context { subjectName?: string; chapterTitle?: string }

export function LessonItemCard({ item, to, context }: { item: LessonItem; to: string; context: Context }) {
  return (
    <Card className="p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {[context.subjectName, context.chapterTitle].filter(Boolean).join(" • ")}
          </p>
          <Link to={to} className="font-medium leading-snug hover:text-primary line-clamp-2">{item.title}</Link>
        </div>
        <SaveButton kind="lesson" id={item.id} saved={item.saved} title={item.title} />
      </div>
      {item.summary && <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {item.duration_minutes} min</span>
        {item.progressStatus === "completed" ? (
          <span className="flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Completed</span>
        ) : item.progressStatus === "in_progress" ? (
          <span className="flex items-center gap-1 text-primary"><CircleDot className="h-3.5 w-3.5" aria-hidden="true" /> In progress</span>
        ) : (
          <span>Not started</span>
        )}
      </div>
    </Card>
  );
}

const difficultyVariant: Record<string, "secondary" | "outline" | "destructive"> = {
  easy: "secondary",
  medium: "outline",
  hard: "destructive",
};

export function TestItemCard({ item, context, showCategory }: { item: TestItem; context: Context; showCategory: boolean }) {
  const action = item.hasOpenAttempt ? "Resume" : item.submittedCount > 0 ? "Retake" : "Start";
  return (
    <Card className="p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {[context.subjectName, context.chapterTitle].filter(Boolean).join(" • ")}
          </p>
          <p className="font-medium leading-snug line-clamp-2">{item.title}</p>
        </div>
        <SaveButton kind="test" id={item.id} saved={item.saved} title={item.title} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {showCategory && item.test_type in TEST_CATEGORY_LABEL && (
          <Badge variant="secondary">{TEST_CATEGORY_LABEL[item.test_type as TestCategory]}</Badge>
        )}
        <Badge variant={difficultyVariant[item.difficulty] ?? "outline"} className="capitalize">{item.difficulty}</Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {item.duration_minutes} min</span>
        {item.bestPercentage !== null && (
          <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-yellow-600" aria-hidden="true" /> Best {item.bestPercentage}% · {item.submittedCount} attempt{item.submittedCount === 1 ? "" : "s"}</span>
        )}
      </div>
      <Button asChild size="sm" className="mt-auto" variant={action === "Start" ? "default" : "outline"}>
        <Link to={`/tests/${item.id}`} aria-label={`${action} ${item.title}`}>{action}</Link>
      </Button>
    </Card>
  );
}
