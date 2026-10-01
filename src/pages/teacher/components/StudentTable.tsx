import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, Megaphone, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { pct, relativeTime } from "@/lib/teacher/format";
import { studentSignals } from "@/lib/teacher/signals";
import type { TeacherStudent } from "@/lib/teacher/types";
import { cn } from "@/lib/utils";
import { Avatar, EmptyState, Pagination, StatusPill, TButton, usePaged } from "@/components/teacher/portal/ui";

type SortKey = "name" | "course" | "lessons" | "average" | "attendance" | "active";

const PAGE_SIZE = 25;

const sorters: Record<SortKey, (a: TeacherStudent, b: TeacherStudent) => number> = {
  name: (a, b) => a.full_name.localeCompare(b.full_name),
  course: (a, b) => (a.subject_names[0] ?? "").localeCompare(b.subject_names[0] ?? ""),
  lessons: (a, b) => a.lessons_completed - b.lessons_completed,
  // missing values always sort last, regardless of direction (handled below)
  average: (a, b) => (a.avg_score ?? -1) - (b.avg_score ?? -1),
  attendance: (a, b) => (a.attendance_pct ?? -1) - (b.attendance_pct ?? -1),
  active: (a, b) => (a.last_active_at ?? "").localeCompare(b.last_active_at ?? ""),
};

function StudentStatus({ student }: { student: TeacherStudent }) {
  const signals = studentSignals(student);
  if (signals.length > 0) {
    return (
      <StatusPill tone={signals[0].severity === "high" ? "danger" : "warning"} dot className="cursor-help">
        <span title={signals.map((s) => s.label).join("\n")}>Needs attention</span>
      </StatusPill>
    );
  }
  return (
    <StatusPill tone="success" dot>
      On track
    </StatusPill>
  );
}

function SortHeader({ label, k, sort, onSort, className }: { label: string; k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cn("px-4 py-2.5 font-medium", className)}>
      <button type="button" onClick={() => onSort(k)} className="tp-focus inline-flex items-center gap-1 rounded hover:text-foreground">
        {label}
        <Icon className={cn("h-3.5 w-3.5", !active && "opacity-40")} aria-hidden="true" />
      </button>
    </th>
  );
}

/**
 * The roster table: sortable, paginated, selectable (bulk: announce to the
 * selection). Collapses to cards below the md breakpoint.
 */
export default function StudentTable({ students, emptyTitle = "No students match these filters", resetKey }: { students: TeacherStudent[]; emptyTitle?: string; resetKey?: unknown }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const rows = [...students];
    rows.sort((a, b) => {
      if (sort.key === "average" || sort.key === "attendance") {
        const av = sort.key === "average" ? a.avg_score : a.attendance_pct;
        const bv = sort.key === "average" ? b.avg_score : b.attendance_pct;
        if (av === null && bv !== null) return 1;
        if (bv === null && av !== null) return -1;
      }
      return sorters[sort.key](a, b) * sort.dir;
    });
    return rows;
  }, [students, sort]);

  const { page, pageCount, setPage, rows } = usePaged(sorted, PAGE_SIZE, `${String(resetKey)}|${sort.key}|${sort.dir}`);

  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" || key === "course" ? 1 : -1 }));
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pageIds = rows.map((r) => r.student_id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  if (students.length === 0) {
    return <EmptyState icon={Users} title={emptyTitle} description="Students appear here once they use your lessons, take your assignments or join your classes." />;
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-accent/50 px-4 py-2 text-[13px]" role="region" aria-label="Bulk actions">
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <TButton size="sm" variant="secondary" onClick={() => setSelected(new Set())}>
              Clear
            </TButton>
            <TButton size="sm" onClick={() => navigate(`/teacher/announcements?new=1&students=${[...selected].join(",")}`)}>
              <Megaphone />
              Send announcement
            </TButton>
          </div>
        </div>
      )}

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[14px]">
          <caption className="sr-only">Students</caption>
          <thead className="bg-card text-left text-[12px] text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="w-10 px-4 py-2.5">
                <Checkbox
                  checked={allOnPage}
                  onCheckedChange={(v) =>
                    setSelected((s) => {
                      const next = new Set(s);
                      pageIds.forEach((id) => (v ? next.add(id) : next.delete(id)));
                      return next;
                    })
                  }
                  aria-label="Select all students on this page"
                />
              </th>
              <SortHeader label="Student" k="name" sort={sort} onSort={onSort} />
              <SortHeader label="Course" k="course" sort={sort} onSort={onSort} />
              <SortHeader label="Lessons done" k="lessons" sort={sort} onSort={onSort} className="text-right" />
              <SortHeader label="Average" k="average" sort={sort} onSort={onSort} className="text-right" />
              <SortHeader label="Attendance" k="attendance" sort={sort} onSort={onSort} className="text-right" />
              <SortHeader label="Last active" k="active" sort={sort} onSort={onSort} />
              <th scope="col" className="px-4 py-2.5 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.student_id} className={cn("border-b border-border last:border-0 transition-colors hover:bg-muted/40", selected.has(s.student_id) && "bg-accent/40")}>
                <td className="px-4 py-3">
                  <Checkbox checked={selected.has(s.student_id)} onCheckedChange={() => toggle(s.student_id)} aria-label={`Select ${s.full_name}`} />
                </td>
                <td className="px-4 py-3">
                  <Link to={`/teacher/students/${s.student_id}`} className="tp-focus flex items-center gap-3 rounded font-medium hover:underline">
                    <Avatar name={s.full_name} size={28} />
                    <span className="min-w-0">
                      <span className="block truncate">{s.full_name}</span>
                      {s.grade && <span className="block text-[12px] font-normal text-muted-foreground">Class {s.grade}</span>}
                    </span>
                  </Link>
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">{s.subject_names.join(", ") || "Classes only"}</td>
                <td className="tp-tabular px-4 py-3 text-right">
                  {s.lessons_completed}
                  <span className="text-muted-foreground"> / {s.lessons_started}</span>
                </td>
                <td className="tp-tabular px-4 py-3 text-right">{pct(s.avg_score)}</td>
                <td className="tp-tabular px-4 py-3 text-right">{pct(s.attendance_pct)}</td>
                <td className="px-4 py-3 text-muted-foreground">{relativeTime(s.last_active_at)}</td>
                <td className="px-4 py-3">
                  <StudentStatus student={s} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((s) => (
          <li key={s.student_id}>
            <Link to={`/teacher/students/${s.student_id}`} className="tp-focus flex items-start gap-3 px-4 py-3">
              <Avatar name={s.full_name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{s.full_name}</span>
                  <StudentStatus student={s} />
                </div>
                <p className="truncate text-[13px] text-muted-foreground">{s.subject_names.join(", ") || "Classes only"}</p>
                <p className="tp-tabular mt-1 flex gap-3 text-[12px] text-muted-foreground">
                  <span>Avg {pct(s.avg_score)}</span>
                  <span>Attendance {pct(s.attendance_pct)}</span>
                  <span>{relativeTime(s.last_active_at)}</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Pagination page={page} pageCount={pageCount} total={sorted.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}
