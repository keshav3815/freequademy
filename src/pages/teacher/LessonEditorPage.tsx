import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bold, Code, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Markdown } from "@/lib/markdown";
import { GRADE_OPTIONS, useCurriculum as useCurriculumOptions } from "@/hooks/useCurriculum";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ErrorState, Field, PageHeader, Panel, Segmented, TButton, inputClass } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";

interface Tool {
  label: string;
  icon: LucideIcon;
  /** wrap the selection, or prefix each selected line */
  wrap?: [string, string];
  prefix?: string;
  placeholder: string;
}

const TOOLS: Tool[] = [
  { label: "Heading", icon: Heading2, prefix: "## ", placeholder: "Heading" },
  { label: "Subheading", icon: Heading3, prefix: "### ", placeholder: "Subheading" },
  { label: "Bold", icon: Bold, wrap: ["**", "**"], placeholder: "bold text" },
  { label: "Italic", icon: Italic, wrap: ["*", "*"], placeholder: "italic text" },
  { label: "Bulleted list", icon: List, prefix: "- ", placeholder: "List item" },
  { label: "Numbered list", icon: ListOrdered, prefix: "1. ", placeholder: "List item" },
  { label: "Quote", icon: Quote, prefix: "> ", placeholder: "Quote" },
  { label: "Code or formula", icon: Code, wrap: ["`", "`"], placeholder: "x² + 2x + 1 = 0" },
  { label: "Link", icon: Link2, wrap: ["[", "](https://)"], placeholder: "link text" },
];

/** Minimal formatting toolbar over the Markdown the lesson renderer supports. */
function MarkdownToolbar({ textarea, onChange }: { textarea: React.RefObject<HTMLTextAreaElement>; onChange: (value: string) => void }) {
  const apply = (tool: Tool) => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || tool.placeholder;
    let insert: string;
    if (tool.wrap) {
      insert = tool.wrap[0] + selected + tool.wrap[1];
    } else {
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const needsBreak = value.slice(lineStart, s).trim().length > 0;
      insert = (needsBreak ? "\n" : "") + selected.split("\n").map((l) => tool.prefix + l).join("\n");
    }
    const next = value.slice(0, s) + insert + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + insert.length, s + insert.length);
    });
  };
  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
      {TOOLS.map((t) => (
        <button key={t.label} type="button" onClick={() => apply(t)} title={t.label} aria-label={t.label} className="tp-focus rounded p-1.5 text-muted-foreground hover:bg-card hover:text-foreground">
          <t.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export default function LessonEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [classLevel, setClassLevel] = useState(params.get("class") ?? "10");
  const [subjectId, setSubjectId] = useState(params.get("subject") ?? "");
  const [view, setView] = useState<"write" | "preview">("write");
  const [form, setForm] = useState({
    chapter_id: params.get("chapter") ?? "",
    title: "",
    summary: "",
    video_url: "",
    duration_minutes: "10",
    sort_order: "0",
    content_md: "",
    content_format: "standard",
    status: "draft",
  });
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "published" | null>(null);
  const { subjects, chapters } = useCurriculumOptions(classLevel, subjectId);
  useDocumentMeta({ title: id ? "Edit lesson" : "New lesson" });

  useEffect(() => {
    if (!id && params.get("type") === "video") videoRef.current?.focus();
  }, [id, params]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("lessons")
      .select("chapter_id, title, summary, video_url, duration_minutes, sort_order, content_md, content_format, status, chapter:chapters(subject_id, subject:subjects(class_level))")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadError(error?.message ?? "This lesson doesn't exist or isn't yours.");
          setLoading(false);
          return;
        }
        const chapter = data.chapter as { subject_id: string; subject: { class_level: number } | null } | null;
        if (chapter?.subject) setClassLevel(String(chapter.subject.class_level));
        if (chapter) setSubjectId(chapter.subject_id);
        setForm({
          chapter_id: data.chapter_id,
          title: data.title,
          summary: data.summary ?? "",
          video_url: data.video_url ?? "",
          duration_minutes: String(data.duration_minutes),
          sort_order: String(data.sort_order),
          content_md: data.content_md,
          content_format: data.content_format,
          status: data.status,
        });
        setLoading(false);
      });
  }, [id]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (status: "draft" | "published") => {
    const videoUrl = form.video_url.trim();
    if (!form.chapter_id) return toast.error("Choose a chapter for this lesson.");
    if (form.title.trim().length < 2) return toast.error("Add a title (at least 2 characters).");
    if (videoUrl && !/^https:\/\/\S+$/i.test(videoUrl)) return toast.error("Video links must start with https://");
    setSaving(status);
    const payload = {
      chapter_id: form.chapter_id,
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      video_url: videoUrl || null,
      duration_minutes: Math.min(600, Math.max(1, parseInt(form.duration_minutes) || 10)),
      sort_order: parseInt(form.sort_order) || 0,
      content_md: form.content_md,
      content_format: form.content_format,
      status,
    };
    const { error } = id ? await supabase.from("lessons").update(payload).eq("id", id) : await supabase.from("lessons").insert(payload);
    setSaving(null);
    if (error) {
      toast.error("Could not save lesson", { description: error.message });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["teacher"] });
    toast.success(status === "published" ? "Lesson published" : "Draft saved");
    navigate(subjectId ? `/teacher/courses/${subjectId}/content` : "/teacher/courses");
  };

  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div>
      <PageHeader
        back={{ to: subjectId ? `/teacher/courses/${subjectId}/content` : "/teacher/courses", label: "Course content" }}
        title={id ? "Edit lesson" : "New lesson"}
        description="Lessons are organised by class, subject and chapter."
      />

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]" role="status" aria-label="Loading lesson">
          <Skeleton className="h-[520px] rounded-lg" />
          <Skeleton className="h-[360px] rounded-lg" />
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save("published");
          }}
          className="grid gap-6 pb-24 lg:grid-cols-[1fr_320px]"
        >
          <div className="min-w-0 space-y-6">
            <Panel>
              <div className="space-y-4">
                <Field label="Title" htmlFor="lesson-title">
                  <input id="lesson-title" className={cn(inputClass, "h-11 text-[16px] font-medium")} value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} required />
                </Field>
                <Field label="One-line summary" htmlFor="lesson-summary" hint="Shown under the title in lesson lists.">
                  <input id="lesson-summary" className={inputClass} value={form.summary} maxLength={500} onChange={(e) => set("summary", e.target.value)} />
                </Field>
              </div>
            </Panel>

            <section aria-label="Lesson content" className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h2 className="text-[15px] font-semibold">Content</h2>
                <Segmented
                  label="Editor view"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "write", label: "Write" },
                    { value: "preview", label: "Preview" },
                  ]}
                />
              </div>
              {view === "write" ? (
                <>
                  <MarkdownToolbar textarea={contentRef} onChange={(v) => set("content_md", v)} />
                  <label htmlFor="lesson-content" className="sr-only">
                    Lesson content
                  </label>
                  <textarea
                    id="lesson-content"
                    ref={contentRef}
                    rows={20}
                    value={form.content_md}
                    onChange={(e) => set("content_md", e.target.value)}
                    placeholder={"## Introduction\n\nExplain the concept…\n\n- point one\n- point two"}
                    className="block min-h-[420px] w-full resize-y border-0 bg-card px-4 py-3 font-mono text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  />
                  <p className="border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
                    Supports headings, lists, quotes, code, bold, italic and https links. Attach PDFs and images from the Resource Library.
                  </p>
                </>
              ) : (
                <div className="min-h-[420px] px-6 py-5">
                  {form.title && <h1 className="mb-2 text-2xl font-semibold">{form.title}</h1>}
                  {form.summary && <p className="mb-4 text-muted-foreground">{form.summary}</p>}
                  <Markdown source={form.content_md || "_Nothing to preview yet._"} />
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <Panel title="Placement">
              <div className="space-y-4">
                <Field label="Class" htmlFor="lesson-class">
                  <Select
                    value={classLevel}
                    onValueChange={(v) => {
                      setClassLevel(v);
                      setSubjectId("");
                      set("chapter_id", "");
                    }}
                  >
                    <SelectTrigger id="lesson-class" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          Class {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Subject" htmlFor="lesson-subject">
                  <Select
                    value={subjectId}
                    onValueChange={(v) => {
                      setSubjectId(v);
                      set("chapter_id", "");
                    }}
                  >
                    <SelectTrigger id="lesson-subject" className="h-9">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Chapter" htmlFor="lesson-chapter" hint={subjectId && chapters.length === 0 ? "No chapters yet — an admin adds them in Curriculum." : undefined}>
                  <Select value={form.chapter_id} onValueChange={(v) => set("chapter_id", v)} disabled={!subjectId}>
                    <SelectTrigger id="lesson-chapter" className="h-9">
                      <SelectValue placeholder={chapters.length ? "Choose" : "No chapters"} />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Position in chapter" htmlFor="lesson-order" hint="You can also drag lessons in the course builder.">
                  <input id="lesson-order" type="number" className={inputClass} value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
                </Field>
              </div>
            </Panel>

            <Panel title="Media & format">
              <div className="space-y-4">
                <Field label="Video link" htmlFor="lesson-video" hint="YouTube or any https link.">
                  <input id="lesson-video" ref={videoRef} type="url" className={inputClass} value={form.video_url} placeholder="https://youtube.com/watch?v=…" onChange={(e) => set("video_url", e.target.value)} />
                </Field>
                <Field label="Duration (minutes)" htmlFor="lesson-duration">
                  <input id="lesson-duration" type="number" min={1} max={600} className={inputClass} value={form.duration_minutes} onChange={(e) => set("duration_minutes", e.target.value)} />
                </Field>
                <Field label="Format" htmlFor="lesson-format">
                  <Select value={form.content_format} onValueChange={(v) => set("content_format", v)}>
                    <SelectTrigger id="lesson-format" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard — notes and/or video</SelectItem>
                      <SelectItem value="animated">Animated — interactive lesson</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Panel>
          </aside>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur lg:left-[var(--tp-content-left)]">
            <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
              <span className="hidden text-[13px] text-muted-foreground sm:block">{id ? (form.status === "published" ? "Published — visible to students" : "Draft — only you can see it") : "New lesson"}</span>
              <div className="ml-auto flex gap-2">
                <TButton type="button" variant="ghost" onClick={() => setView(view === "write" ? "preview" : "write")}>
                  {view === "write" ? "Preview" : "Edit"}
                </TButton>
                <TButton type="button" variant="secondary" onClick={() => save("draft")} loading={saving === "draft"} disabled={!!saving}>
                  Save draft
                </TButton>
                <TButton type="submit" loading={saving === "published"} disabled={!!saving}>
                  {form.status === "published" && id ? "Update" : "Publish"}
                </TButton>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
