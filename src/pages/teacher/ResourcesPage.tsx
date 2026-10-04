import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { BookOpenCheck, Download, ExternalLink, FileImage, FileSpreadsheet, FileText, FileVideo, Folder, FolderOpen, Link2, NotebookText, Upload, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { teacherApi, useCourses, useResources, useTeacherMutation } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { MAX_RESOURCE_BYTES, type ResourceInput } from "@/lib/teacher/api";
import { fileSize } from "@/lib/teacher/format";
import type { Resource, ResourceKind } from "@/lib/teacher/types";
import { cn } from "@/lib/utils";
import { ConfirmDialog, EmptyState, Field, PageHeader, Pagination, QueryView, SearchInput, Segmented, SkeletonRows, TButton, inputClass, usePaged } from "@/components/teacher/portal/ui";
import { MoreMenu } from "./components/shared";

const KINDS: { value: ResourceKind; label: string; icon: LucideIcon }[] = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "video", label: "Video", icon: FileVideo },
  { value: "image", label: "Image", icon: FileImage },
  { value: "document", label: "Document", icon: NotebookText },
  { value: "question_bank", label: "Question bank", icon: FileSpreadsheet },
  { value: "worksheet", label: "Worksheet", icon: BookOpenCheck },
  { value: "link", label: "Link", icon: Link2 },
];
const kindMeta = (k: ResourceKind) => KINDS.find((x) => x.value === k) ?? KINDS[3];

function guessKind(file: File): ResourceKind {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  if (/sheet|excel|csv/.test(file.type) || /\.(xlsx?|csv)$/i.test(file.name)) return "question_bank";
  return "document";
}

const PAGE_SIZE = 20;

interface EditorState {
  mode: "upload" | "link" | "edit";
  resource?: Resource;
}

function ResourceDialog({ state, folders, defaultSubject, onClose }: { state: EditorState | null; folders: string[]; defaultSubject: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const courses = useCourses();
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState<ResourceInput & { tagText: string }>({ title: "", kind: "pdf", folder: "General", tags: [], subject_id: null, tagText: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const upload = useTeacherMutation((input: ResourceInput, f: File) => teacherApi.uploadResource(user!.id, input, f), ["resources"]);
  const addLink = useTeacherMutation(teacherApi.addLinkResource, ["resources"]);
  const update = useTeacherMutation(teacherApi.updateResource, ["resources"]);

  useEffect(() => {
    if (!state) return;
    setError(null);
    setFile(null);
    setUrl("");
    if (state.mode === "edit" && state.resource) {
      const r = state.resource;
      setMeta({ title: r.title, kind: r.kind, folder: r.folder, tags: r.tags, subject_id: r.subject_id, tagText: r.tags.join(", ") });
    } else {
      setTab(state.mode === "link" ? "link" : "upload");
      setMeta({ title: "", kind: state.mode === "link" ? "link" : "pdf", folder: "General", tags: [], subject_id: defaultSubject, tagText: "" });
    }
  }, [state, defaultSubject]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_RESOURCE_BYTES) {
      setError("Files can be at most 50 MB.");
      return;
    }
    setError(null);
    setFile(f);
    setMeta((m) => ({ ...m, title: m.title || f.name.replace(/\.[^.]+$/, ""), kind: guessKind(f) }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: ResourceInput = {
      title: meta.title.trim(),
      kind: meta.kind,
      folder: meta.folder.trim() || "General",
      tags: meta.tagText.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10),
      subject_id: meta.subject_id,
    };
    if (!input.title) return setError("Add a title.");
    const done = (msg: string) => ({
      onSuccess: () => {
        toast.success(msg);
        onClose();
      },
      onError: (err: Error) => setError(err.message),
      onSettled: () => setPending(false),
    });
    setPending(true);
    if (state?.mode === "edit" && state.resource) return update.mutate([state.resource.id, input], done("Resource updated"));
    if (tab === "upload") {
      if (!file) {
        setPending(false);
        return setError("Choose a file to upload.");
      }
      return upload.mutate([input, file], done("Uploaded"));
    }
    if (!/^https:\/\/\S+$/i.test(url.trim())) {
      setPending(false);
      return setError("Links must start with https://");
    }
    addLink.mutate([input, url], done("Link added"));
  };

  const editing = state?.mode === "edit";

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit resource" : "Add a resource"}</DialogTitle>
          <DialogDescription>{editing ? "Rename, move, tag or link it to a course." : "Upload a file (up to 50 MB) or save a link. Only you can see your library."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!editing && (
            <Segmented
              label="Resource source"
              value={tab}
              onChange={(t) => {
                setTab(t);
                setMeta((m) => ({ ...m, kind: t === "link" ? "link" : file ? guessKind(file) : "pdf" }));
              }}
              options={[
                { value: "upload", label: "Upload file" },
                { value: "link", label: "Add link" },
              ]}
            />
          )}
          {!editing && tab === "upload" && (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-ring",
                dragging ? "border-primary bg-accent/50" : "border-border hover:border-primary/40",
              )}
            >
              <Upload className="mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <span className="text-[14px] font-medium">{file ? file.name : "Drop a file here, or click to browse"}</span>
              <span className="text-[12px] text-muted-foreground">{file ? fileSize(file.size) : "PDF, video, image, document or spreadsheet"}</span>
              <input type="file" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
          )}
          {!editing && tab === "link" && (
            <Field label="URL" htmlFor="r-url">
              <input id="r-url" type="url" className={inputClass} value={url} placeholder="https://" onChange={(e) => setUrl(e.target.value)} />
            </Field>
          )}
          <Field label="Title" htmlFor="r-title">
            <input id="r-title" className={inputClass} value={meta.title} maxLength={200} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="r-kind">
              <Select value={meta.kind} onValueChange={(v) => setMeta({ ...meta, kind: v as ResourceKind })}>
                <SelectTrigger id="r-kind" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Folder" htmlFor="r-folder">
              <input id="r-folder" list="r-folders" className={inputClass} value={meta.folder} maxLength={80} onChange={(e) => setMeta({ ...meta, folder: e.target.value })} />
              <datalist id="r-folders">
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Tags" htmlFor="r-tags" hint="Comma separated, up to 10.">
            <input id="r-tags" className={inputClass} value={meta.tagText} onChange={(e) => setMeta({ ...meta, tagText: e.target.value })} placeholder="algebra, revision" />
          </Field>
          <Field label="Course" htmlFor="r-course">
            <Select value={meta.subject_id ?? "none"} onValueChange={(v) => setMeta({ ...meta, subject_id: v === "none" ? null : v })}>
              <SelectTrigger id="r-course" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked to a course</SelectItem>
                {(courses.data ?? []).map((c) => (
                  <SelectItem key={c.subject_id} value={c.subject_id}>
                    {c.subject_name} · Class {c.class_level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <TButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </TButton>
            <TButton type="submit" loading={pending}>
              {editing ? "Save changes" : tab === "upload" ? "Upload" : "Add link"}
            </TButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ResourcesPage() {
  useDocumentMeta({ title: "Resource library" });
  const [params, setParams] = useSearchParams();
  const resources = useResources();
  const courses = useCourses();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [folder, setFolder] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | ResourceKind>("all");
  const [sort, setSort] = useState<"newest" | "name" | "size">("newest");
  const [editor, setEditor] = useState<EditorState | null>(params.get("new") === "1" ? { mode: "upload" } : null);
  const [toDelete, setToDelete] = useState<Resource | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const remove = useTeacherMutation(teacherApi.deleteResource, ["resources"]);

  const all = useMemo(() => resources.data ?? [], [resources.data]);
  const folders = useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((r) => m.set(r.folder, (m.get(r.folder) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [all]);
  const courseName = (id: string | null) => {
    const c = courses.data?.find((x) => x.subject_id === id);
    return c ? `${c.subject_name} · ${c.class_level}` : null;
  };

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rows = all.filter(
      (r) =>
        (!folder || r.folder === folder) &&
        (kind === "all" || r.kind === kind) &&
        (!query || r.title.toLowerCase().includes(query) || r.tags.some((t) => t.toLowerCase().includes(query)) || r.folder.toLowerCase().includes(query)),
    );
    return rows.sort((a, b) => (sort === "name" ? a.title.localeCompare(b.title) : sort === "size" ? (b.size_bytes ?? 0) - (a.size_bytes ?? 0) : b.created_at.localeCompare(a.created_at)));
  }, [all, q, folder, kind, sort]);
  const { page, pageCount, setPage, rows } = usePaged(visible, PAGE_SIZE, `${q}|${folder}|${kind}|${sort}`);

  const openResource = async (r: Resource, download = false) => {
    setOpening(r.id);
    try {
      const href = await teacherApi.resourceUrl(r, download);
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Could not open this resource", { description: (e as Error).message });
    } finally {
      setOpening(null);
    }
  };

  const closeEditor = () => {
    setEditor(null);
    if (params.get("new")) setParams({}, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Resource Library"
        description="Your notes, worksheets, videos and links — organised in folders."
        actions={
          <TButton onClick={() => setEditor({ mode: "upload" })}>
            <Upload />
            Upload
          </TButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Folders" className="lg:sticky lg:top-20 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {[{ name: null as string | null, count: all.length }, ...folders.map(([name, count]) => ({ name, count }))].map((f) => (
              <li key={f.name ?? "__all"} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setFolder(f.name)}
                  aria-current={folder === f.name ? "true" : undefined}
                  className={cn(
                    "tp-focus flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[14px] transition-colors",
                    folder === f.name ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {folder === f.name ? <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Folder className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span className="flex-1 truncate">{f.name ?? "All resources"}</span>
                  <span className="tp-tabular text-[12px]">{f.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={q} onChange={setQ} placeholder="Search by title, tag or folder…" label="Search resources" className="sm:flex-1" />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger className="h-9 sm:w-40" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="h-9 sm:w-36" aria-label="Sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <QueryView query={resources} what="your resources" skeleton={<SkeletonRows rows={6} className="p-5" />}>
              {() =>
                all.length === 0 ? (
                  <EmptyState
                    icon={FolderOpen}
                    title="Your library is empty"
                    description="Upload notes, worksheets or videos, or save useful links for your courses."
                    action={
                      <TButton onClick={() => setEditor({ mode: "upload" })}>
                        <Upload />
                        Upload a resource
                      </TButton>
                    }
                  />
                ) : visible.length === 0 ? (
                  <EmptyState icon={FolderOpen} title="Nothing matches" description="Try another folder, type or search." />
                ) : (
                  <>
                    <ul className="divide-y divide-border">
                      {rows.map((r) => {
                        const K = kindMeta(r.kind);
                        const course = courseName(r.subject_id);
                        return (
                          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <K.icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <button type="button" onClick={() => openResource(r)} className="tp-focus block max-w-full truncate rounded text-left text-[14px] font-medium hover:underline" disabled={opening === r.id}>
                                {r.title}
                              </button>
                              <p className="truncate text-[12px] text-muted-foreground">
                                {K.label} · {r.folder}
                                {course ? ` · ${course}` : ""}
                                {r.size_bytes !== null ? ` · ${fileSize(r.size_bytes)}` : ""} · {format(new Date(r.created_at), "d MMM yyyy")}
                              </p>
                              {r.tags.length > 0 && (
                                <ul className="mt-1 flex flex-wrap gap-1" aria-label="Tags">
                                  {r.tags.map((t) => (
                                    <li key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                      {t}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <TButton variant="ghost" size="iconSm" aria-label={r.external_url ? `Open ${r.title}` : `Download ${r.title}`} onClick={() => openResource(r, !r.external_url)} loading={opening === r.id}>
                              {opening === r.id ? null : r.external_url ? <ExternalLink /> : <Download />}
                            </TButton>
                            <MoreMenu
                              label={`More actions for ${r.title}`}
                              items={[
                                { label: "Preview", onSelect: () => openResource(r) },
                                { label: "Edit / move", onSelect: () => setEditor({ mode: "edit", resource: r }) },
                                { label: "Delete", danger: true, onSelect: () => setToDelete(r) },
                              ]}
                            />
                          </li>
                        );
                      })}
                    </ul>
                    <Pagination page={page} pageCount={pageCount} total={visible.length} pageSize={PAGE_SIZE} onPage={setPage} />
                  </>
                )
              }
            </QueryView>
          </div>
        </div>
      </div>

      <ResourceDialog state={editor} folders={folders.map(([f]) => f)} defaultSubject={params.get("subject")} onClose={closeEditor} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete resource?"
        description={`“${toDelete?.title}” will be permanently deleted${toDelete?.storage_path ? ", including the uploaded file" : ""}. This cannot be undone.`}
        confirmLabel="Delete resource"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate([toDelete], {
            onSuccess: () => {
              toast.success("Resource deleted");
              setToDelete(null);
            },
            onError: (e) => toast.error("Could not delete", { description: e.message }),
          })
        }
      />
    </div>
  );
}
