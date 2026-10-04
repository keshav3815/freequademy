import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssignments } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import type { TeacherAssignment } from "@/lib/teacher/types";
import { EmptyState, PageHeader, Panel, QueryView, SearchInput, Segmented, SkeletonRows, TButton } from "@/components/teacher/portal/ui";
import AssignmentList from "./components/AssignmentList";

type Tab = "all" | "draft" | "published" | "review" | "completed";

const inTab: Record<Tab, (a: TeacherAssignment) => boolean> = {
  all: () => true,
  draft: (a) => a.status !== "published",
  published: (a) => a.status === "published",
  review: (a) => a.awaiting_review_count > 0,
  completed: (a) => a.submitted_count > 0 && a.awaiting_review_count === 0,
};

const EMPTY: Record<Tab, { title: string; description: string }> = {
  all: { title: "No assignments yet", description: "Create a quiz or test and publish it to your students." },
  draft: { title: "No drafts", description: "Assignments you haven't published yet appear here." },
  published: { title: "Nothing published", description: "Publish an assignment to make it available to students." },
  review: { title: "No assignments to review", description: "You're all caught up." },
  completed: { title: "Nothing completed yet", description: "Assignments whose submissions are all reviewed appear here." },
};

export default function AssignmentsPage() {
  useDocumentMeta({ title: "Assignments" });
  const [params, setParams] = useSearchParams();
  const tab = (["all", "draft", "published", "review", "completed"].includes(params.get("tab") ?? "") ? params.get("tab") : "all") as Tab;
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("all");
  const assignments = useAssignments();

  const rows = useMemo(() => assignments.data ?? [], [assignments.data]);
  const courses = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((a) => m.set(a.subject_id, `${a.subject_name} · Class ${a.class_level}`));
    return [...m.entries()];
  }, [rows]);
  const counts = useMemo(() => Object.fromEntries((Object.keys(inTab) as Tab[]).map((t) => [t, rows.filter(inTab[t]).length])) as Record<Tab, number>, [rows]);

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Create, review and manage student submissions."
        actions={
          <TButton asChild>
            <Link to="/teacher/assignments/new">
              <Plus />
              Create assignment
            </Link>
          </TButton>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Assignment status"
          value={tab}
          onChange={(t) => setParams(t === "all" ? {} : { tab: t }, { replace: true })}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "draft", label: "Draft", count: counts.draft },
            { value: "published", label: "Published", count: counts.published },
            { value: "review", label: "Needs review", count: counts.review },
            { value: "completed", label: "Completed", count: counts.completed },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className="h-9 sm:w-56" aria-label="Filter by course">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Search assignments…" label="Search assignments" className="sm:w-64" />
        </div>
      </div>

      <Panel bodyClassName="p-0">
        <QueryView query={assignments} what="your assignments" skeleton={<SkeletonRows rows={5} className="p-5" />}>
          {(all) => {
            const query = q.trim().toLowerCase();
            const visible = all.filter((a) => inTab[tab](a) && (course === "all" || a.subject_id === course) && (!query || a.title.toLowerCase().includes(query)));
            const empty = all.length === 0 ? EMPTY.all : EMPTY[tab];
            return (
              <AssignmentList
                assignments={visible}
                empty={
                  <EmptyState
                    icon={ClipboardCheck}
                    title={query || course !== "all" ? "No assignments match" : empty.title}
                    description={query || course !== "all" ? "Try a different search or course." : empty.description}
                    action={
                      all.length === 0 ? (
                        <TButton asChild>
                          <Link to="/teacher/assignments/new">Create assignment</Link>
                        </TButton>
                      ) : undefined
                    }
                  />
                }
              />
            );
          }}
        </QueryView>
      </Panel>
    </div>
  );
}
