import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourses, useStudents } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { studentSignals } from "@/lib/teacher/signals";
import type { TeacherStudent } from "@/lib/teacher/types";
import { PageHeader, Panel, QueryView, SearchInput, SkeletonRows } from "@/components/teacher/portal/ui";
import StudentTable from "./components/StudentTable";

type Perf = "all" | "80" | "50-80" | "under50" | "none";
type Att = "all" | "90" | "75-90" | "under75" | "none";
type Status = "all" | "attention" | "ontrack";

const perfMatch: Record<Perf, (s: TeacherStudent) => boolean> = {
  all: () => true,
  "80": (s) => s.avg_score !== null && s.avg_score >= 80,
  "50-80": (s) => s.avg_score !== null && s.avg_score >= 50 && s.avg_score < 80,
  under50: (s) => s.avg_score !== null && s.avg_score < 50,
  none: (s) => s.avg_score === null,
};
const attMatch: Record<Att, (s: TeacherStudent) => boolean> = {
  all: () => true,
  "90": (s) => s.attendance_pct !== null && s.attendance_pct >= 90,
  "75-90": (s) => s.attendance_pct !== null && s.attendance_pct >= 75 && s.attendance_pct < 90,
  under75: (s) => s.attendance_pct !== null && s.attendance_pct < 75,
  none: (s) => s.attendance_pct === null,
};

const trigger = "h-9 w-full sm:w-44";

export default function StudentsPage() {
  useDocumentMeta({ title: "Students" });
  const students = useStudents();
  const courses = useCourses();
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("all");
  const [perf, setPerf] = useState<Perf>("all");
  const [att, setAtt] = useState<Att>("all");
  const [status, setStatus] = useState<Status>("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (students.data ?? []).filter((s) => {
      if (query && !s.full_name.toLowerCase().includes(query)) return false;
      if (course !== "all" && !s.subject_ids.includes(course)) return false;
      if (!perfMatch[perf](s) || !attMatch[att](s)) return false;
      if (status !== "all") {
        const flagged = studentSignals(s).length > 0;
        if (status === "attention" ? !flagged : flagged) return false;
      }
      return true;
    });
  }, [students.data, q, course, perf, att, status]);

  const total = students.data?.length;
  const courseCount = courses.data?.length;

  return (
    <div>
      <PageHeader
        title="Students"
        description={
          total === undefined
            ? "Everyone learning from your courses and classes."
            : `${total} student${total === 1 ? "" : "s"}${courseCount ? ` across your ${courseCount} course${courseCount === 1 ? "" : "s"}` : ""}.`
        }
      />

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search students…" label="Search students" className="lg:w-64" />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className={trigger} aria-label="Course">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {(courses.data ?? []).map((c) => (
                <SelectItem key={c.subject_id} value={c.subject_id}>
                  {c.subject_name} · Class {c.class_level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={perf} onValueChange={(v) => setPerf(v as Perf)}>
            <SelectTrigger className={trigger} aria-label="Performance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any performance</SelectItem>
              <SelectItem value="80">Average 80%+</SelectItem>
              <SelectItem value="50-80">Average 50–79%</SelectItem>
              <SelectItem value="under50">Average under 50%</SelectItem>
              <SelectItem value="none">No scores yet</SelectItem>
            </SelectContent>
          </Select>
          <Select value={att} onValueChange={(v) => setAtt(v as Att)}>
            <SelectTrigger className={trigger} aria-label="Attendance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any attendance</SelectItem>
              <SelectItem value="90">Attendance 90%+</SelectItem>
              <SelectItem value="75-90">Attendance 75–89%</SelectItem>
              <SelectItem value="under75">Attendance under 75%</SelectItem>
              <SelectItem value="none">No classes marked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger className={trigger} aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="attention">Needs attention</SelectItem>
              <SelectItem value="ontrack">On track</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Panel bodyClassName="p-0">
        <QueryView query={students} what="your students" skeleton={<SkeletonRows rows={8} className="p-5" />}>
          {(all) => (
            <StudentTable
              students={filtered}
              resetKey={`${q}|${course}|${perf}|${att}|${status}`}
              emptyTitle={all.length === 0 ? "No students yet" : "No students match these filters"}
            />
          )}
        </QueryView>
      </Panel>
    </div>
  );
}
