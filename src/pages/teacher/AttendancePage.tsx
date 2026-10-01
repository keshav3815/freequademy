import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { UserCheck } from "lucide-react";
import { useSessions, useStudents } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { ATTENTION_THRESHOLDS } from "@/lib/teacher/signals";
import { classState, pct } from "@/lib/teacher/format";
import type { TeacherSession } from "@/lib/teacher/types";
import { Avatar, EmptyState, PageHeader, Panel, ProgressBar, QueryView, Segmented, SkeletonRows, StatusPill, TButton } from "@/components/teacher/portal/ui";
import PerformanceTrend from "./components/PerformanceTrend";
import { ClassRosterSheet } from "./components/ClassDialogs";

export default function AttendancePage() {
  useDocumentMeta({ title: "Attendance" });
  const sessions = useSessions();
  const students = useStudents();
  const [view, setView] = useState<"classes" | "students">("classes");
  const [open, setOpen] = useState<TeacherSession | null>(null);

  const past = useMemo(() => (sessions.data ?? []).filter((s) => classState(s) === "completed" || (s.status !== "cancelled" && new Date(s.scheduled_at) <= new Date())).reverse(), [sessions.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Record and review attendance for your classes." />

      <PerformanceTrend title="Attendance by week" initialMetric="attendance_pct" metrics={["attendance_pct"]} height={200} />

      <Segmented
        label="Attendance view"
        value={view}
        onChange={setView}
        options={[
          { value: "classes", label: "By class" },
          { value: "students", label: "By student" },
        ]}
      />

      {view === "classes" ? (
        <Panel bodyClassName="p-0">
          <QueryView query={sessions} what="your classes" skeleton={<SkeletonRows rows={5} className="p-5" />}>
            {() =>
              past.length === 0 ? (
                <EmptyState icon={UserCheck} title="No classes to mark yet" description="Once a class has started, you can mark attendance here." />
              ) : (
                <ul className="divide-y divide-border">
                  {past.map((s) => {
                    const regs = s.participants.filter((p) => p.status !== "cancelled");
                    const attended = regs.filter((p) => p.status === "attended").length;
                    const absent = regs.filter((p) => p.status === "absent").length;
                    const unmarked = regs.length - attended - absent;
                    return (
                      <li key={s.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold">{s.title}</p>
                          <p className="text-[13px] text-muted-foreground">{format(new Date(s.scheduled_at), "EEE d MMM · h:mm a")}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                          <StatusPill tone="success">{attended} present</StatusPill>
                          <StatusPill tone="danger">{absent} absent</StatusPill>
                          {unmarked > 0 && <StatusPill tone="warning">{unmarked} not marked</StatusPill>}
                        </div>
                        <TButton size="sm" variant={unmarked > 0 ? "primary" : "secondary"} onClick={() => setOpen(s)}>
                          {unmarked > 0 ? "Mark attendance" : "View"}
                        </TButton>
                      </li>
                    );
                  })}
                </ul>
              )
            }
          </QueryView>
        </Panel>
      ) : (
        <Panel bodyClassName="p-0" title="Attendance by student" description={`Below ${ATTENTION_THRESHOLDS.attendancePct}% (over ${ATTENTION_THRESHOLDS.minMarkedSessions}+ marked classes) is flagged as needing attention.`}>
          <QueryView query={students} what="students" skeleton={<SkeletonRows rows={5} className="p-5" />}>
            {(rows) => {
              const withData = rows.filter((s) => s.sessions_attended + s.sessions_absent > 0).sort((a, b) => (a.attendance_pct ?? 0) - (b.attendance_pct ?? 0));
              return withData.length === 0 ? (
                <EmptyState icon={UserCheck} title="No attendance recorded yet" description="Mark attendance on your classes to see it per student." />
              ) : (
                <ul className="divide-y divide-border">
                  {withData.map((s) => (
                    <li key={s.student_id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={s.full_name} size={30} />
                      <Link to={`/teacher/students/${s.student_id}`} className="tp-focus min-w-0 flex-1 truncate rounded text-[14px] font-medium hover:underline">
                        {s.full_name}
                      </Link>
                      <span className="hidden text-[13px] text-muted-foreground sm:inline">
                        {s.sessions_attended} of {s.sessions_attended + s.sessions_absent}
                      </span>
                      <ProgressBar value={s.attendance_pct} label={`${s.full_name} attendance`} className="w-32 sm:w-48" />
                      <span className="sr-only">{pct(s.attendance_pct)}</span>
                    </li>
                  ))}
                </ul>
              );
            }}
          </QueryView>
        </Panel>
      )}

      <ClassRosterSheet session={open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
