import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";
import { youtubeEmbedUrl } from "@/lib/video";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import type { LearningModuleConfig } from "@/lib/learningModules";
import type { LessonItem } from "@/lib/workspaceItems";
import { SaveButton } from "./WorkspaceItemCard";
import { LearningEmptyState, LearningErrorState, LearningLoadingState } from "./LearningStates";

interface Props {
  module: LearningModuleConfig;
  lessonId: string;
  item: LessonItem | undefined;
  nextHref: string | null;
}

/** Reads one lesson inside its workspace and records real progress. */
export default function LessonReader({ module, lessonId, item, nextHref }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const lesson = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, summary, content_md, video_url, duration_minutes, status")
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const published = lesson.data?.status === "published";
  useEffect(() => {
    if (!user || !published) return;
    supabase.rpc("record_lesson_progress", { _lesson_id: lessonId }).then(({ error }) => {
      if (!error) queryClient.invalidateQueries({ queryKey: ["workspace", "lesson-progress", user.id] });
    });
  }, [user, published, lessonId, queryClient]);

  useDocumentMeta({ title: lesson.data?.title ?? module.title, description: lesson.data?.summary ?? undefined });

  if (lesson.isLoading) return <LearningLoadingState label={module.itemNoun.one} />;
  if (lesson.isError) return <LearningErrorState label={`this ${module.itemNoun.one}`} onRetry={() => lesson.refetch()} />;
  if (!lesson.data) return <LearningEmptyState message={`This ${module.itemNoun.one} could not be found.`} action={<Button asChild variant="outline" size="sm"><Link to={module.basePath}>Back to {module.title}</Link></Button>} />;

  const data = lesson.data;
  const embed = youtubeEmbedUrl(data.video_url);
  const completed = item?.progressStatus === "completed";

  const markComplete = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("record_lesson_progress", { _lesson_id: lessonId, _completed: true });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save progress", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["workspace", "lesson-progress", user?.id] });
    toast({ title: "Marked as complete", description: "+10 XP" });
  };

  return (
    <article className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">{data.title}</h1>
          {data.summary && <p className="text-muted-foreground mt-1">{data.summary}</p>}
          <p className="text-xs text-muted-foreground mt-2">{data.duration_minutes} min</p>
        </div>
        {item && <SaveButton kind="lesson" id={item.id} saved={item.saved} title={data.title} />}
      </header>

      {module.id !== "notes" && embed && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
          <iframe
            src={embed}
            title={data.title}
            className="h-full w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      {module.id !== "notes" && !embed && data.video_url && (
        <Button asChild variant="outline">
          <a href={data.video_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Open the lesson video
          </a>
        </Button>
      )}

      {data.content_md.trim() && (
        <Card><CardContent className="pt-6"><Markdown source={data.content_md} /></CardContent></Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {completed ? (
          <span className="inline-flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
            <CheckCircle2 className="h-5 w-5" /> Completed
          </span>
        ) : (
          published && (
            <Button onClick={markComplete} disabled={saving}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as complete
            </Button>
          )
        )}
        {nextHref && <Button asChild variant="outline"><Link to={nextHref}>Next {module.itemNoun.one}</Link></Button>}
      </div>
    </article>
  );
}
