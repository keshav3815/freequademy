import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { BookOpen, ClipboardCheck, ExternalLink, FileText, GraduationCap, Target, Users } from "lucide-react";
import { useAssignments, useCourses, useCurriculum, useStudents } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { pct } from "@/lib/teacher/format";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, PageHeader, Panel, QueryView, SkeletonCards, SkeletonRows, StatCard, TButton } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";
import ContentBuilder from "./components/ContentBuilder";
import StudentTable from "./components/StudentTable";
import AssignmentList from "./components/AssignmentList";
import PerformanceTrend from "./components/PerformanceTrend";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "students", label: "Students" },
  { id: "assignments", label: "Assignments" },
  { id: "analytics", label: "Analytics" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function CourseDetailPage() {
  const { courseId, tab = "overview" } = useParams();
  const courses = useCourses();
  const curriculum = useCurriculum(courseId);
  const students = useStudents();
  const assignments = useAssignments();
  const course = courses.data?.find((c) => c.subject_id === courseId);
  const subject = curriculum.data?.subject;
  const title = subject ? `${subject.name} — Grade ${subject.class_level}` : course ? `${course.subject_name} — Grade ${course.class_level}` : "Course";
  useDocumentMeta({ title });

  const courseStudents = useMemo(() => (students.data ?? []).filter((s) => s.subject_ids.includes(courseId ?? "")), [students.data, courseId]);
  const courseAssignments = useMemo(() => (assignments.data ?? []).filter((a) => a.subject_id === courseId), [assignments.data, courseId]);

  if (!TABS.some((t) => t.id === tab)) return <Navigate to={`/teacher/courses/${courseId}`} replace />;
  const active = tab as Tab;

  if (curriculum.isError) {
    return <ErrorState message="We couldn't load this course." onRetry={() => curriculum.refetch()} />;
  }
  if (!curriculum.isLoading && curriculum.data === null) {
    return <EmptyState icon={BookOpen} title="Course not found" description="It may have been removed from the curriculum." action={<TButton asChild><Link to="/teacher/courses">Back to My Courses</Link></TButton>} />;
  }

  return (
    <div>
      <PageHeader
        back={{ to: "/teacher/courses", label: "My Courses" }}
        title={curriculum.isLoading && !course ? <Skeleton className="h-8 w-72 rounded" /> : title}
        description={subject?.description ?? undefined}
        actions={
          <>
            <TButton variant="secondary" asChild>
              <a href={`/courses/${courseId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Preview
              </a>
            </TButton>
            {subject && (
              <TButton asChild>
                <Link to={`/teacher/lessons/new?class=${subject.class_level}&subject=${subject.id}`}>
                  <FileText />
                  New lesson
                </Link>
              </TButton>
            )}
          </>
        }
      />

      <nav aria-label="Course sections" className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                to={t.id === "overview" ? `/teacher/courses/${courseId}` : `/teacher/courses/${courseId}/${t.id}`}
                aria-current={active === t.id ? "page" : undefined}
                className={cn(
                  "tp-focus -mb-px inline-flex h-10 items-center whitespace-nowrap border-b-2 px-3 text-[14px] font-medium transition-colors",
                  active === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {t.id === "students" && students.data && <span className="ml-1.5 text-[12px] text-muted-foreground">{courseStudents.length}</span>}
                {t.id === "assignments" && assignments.data && <span className="ml-1.5 text-[12px] text-muted-foreground">{courseAssignments.length}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {active === "overview" && (
        <div className="space-y-6">
          {course ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <StatCard icon={Users} label="Students" value={course.student_count} hint="Using your content" />
              <StatCard icon={FileText} label="Lessons" value={course.lesson_count} hint={`${course.published_lesson_count} published`} />
              <StatCard icon={Target} label="Completion" value={pct(course.completion_pct)} hint="Average per student" />
              <StatCard icon={GraduationCap} label="Average score" value={pct(course.avg_score)} hint={`${course.assignment_count} assignment${course.assignment_count === 1 ? "" : "s"}`} />
            </div>
          ) : courses.isLoading ? (
            <SkeletonCards count={4} height={112} className="xl:grid-cols-4" />
          ) : (
            <Panel>
              <p className="text-[14px] text-muted-foreground">You haven't added content to this course yet. Add a lesson or assignment from the Content tab.</p>
            </Panel>
          )}
          <PerformanceTrend fixedCourse={courseId} title="Course performance" metrics={["avg_score", "lessons_completed", "submissions", "active_students"]} />
          <Panel title="Assignments" action={<Link to={`/teacher/courses/${courseId}/assignments`} className="text-[13px] font-medium text-primary hover:underline">View all</Link>} bodyClassName="p-0">
            <QueryView query={assignments} what="assignments" compact skeleton={<SkeletonRows rows={3} className="p-5" />}>
              {() => <AssignmentList assignments={courseAssignments.slice(0, 3)} empty={<EmptyState compact icon={ClipboardCheck} title="No assignments in this course yet" />} />}
            </QueryView>
          </Panel>
        </div>
      )}

      {active === "content" && (
        <QueryView query={curriculum} what="course content" skeleton={<SkeletonRows rows={8} />}>
          {(data) => (data ? <ContentBuilder curriculum={data} /> : null)}
        </QueryView>
      )}

      {active === "students" && (
        <Panel bodyClassName="p-0">
          <QueryView query={students} what="students" skeleton={<SkeletonRows rows={6} className="p-5" />}>
            {() => <StudentTable students={courseStudents} emptyTitle="No students in this course yet" resetKey={courseId} />}
          </QueryView>
        </Panel>
      )}

      {active === "assignments" && (
        <Panel
          bodyClassName="p-0"
          title="Assignments"
          action={
            subject && (
              <TButton size="sm" asChild>
                <Link to={`/teacher/assignments/new?class=${subject.class_level}&subject=${subject.id}`}>New assignment</Link>
              </TButton>
            )
          }
        >
          <QueryView query={assignments} what="assignments" skeleton={<SkeletonRows rows={4} className="p-5" />}>
            {() => <AssignmentList assignments={courseAssignments} empty={<EmptyState icon={ClipboardCheck} title="No assignments in this course yet" description="Create a quiz or test for your students." />} />}
          </QueryView>
        </Panel>
      )}

      {active === "analytics" && (
        <div className="space-y-6">
          <PerformanceTrend fixedCourse={courseId} title="Average score" metrics={["avg_score"]} />
          <PerformanceTrend fixedCourse={courseId} title="Engagement" initialMetric="lessons_completed" metrics={["lessons_completed", "submissions", "active_students"]} />
        </div>
      )}
    </div>
  );
}
