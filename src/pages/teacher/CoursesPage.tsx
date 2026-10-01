import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Plus } from "lucide-react";
import { useCourses } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { EmptyState, PageHeader, QueryView, SearchInput, Segmented, SkeletonCards, TButton } from "@/components/teacher/portal/ui";
import { CourseCard, MoreMenu } from "./components/shared";

type Filter = "all" | "published" | "draft";

export default function CoursesPage() {
  useDocumentMeta({ title: "My courses" });
  const navigate = useNavigate();
  const courses = useCourses();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const rows = courses.data ?? [];
    return { all: rows.length, published: rows.filter((c) => c.published_lesson_count > 0).length, draft: rows.filter((c) => c.published_lesson_count === 0).length };
  }, [courses.data]);

  return (
    <div>
      <PageHeader
        title="My Courses"
        description="Manage your courses, lessons and learning content."
        actions={
          <TButton asChild>
            <Link to="/teacher/courses/new">
              <Plus />
              Create course
            </Link>
          </TButton>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Course status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "published", label: "Published", count: counts.published },
            { value: "draft", label: "Draft", count: counts.draft },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search courses…" label="Search courses" className="sm:w-72" />
      </div>

      <QueryView query={courses} what="your courses" skeleton={<SkeletonCards count={6} height={300} />}>
        {(rows) => {
          if (rows.length === 0) {
            return (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  icon={BookOpen}
                  title="No courses yet"
                  description="Create your first course and start teaching your students."
                  action={
                    <TButton asChild>
                      <Link to="/teacher/courses/new">Create course</Link>
                    </TButton>
                  }
                />
              </div>
            );
          }
          const query = q.trim().toLowerCase();
          const visible = rows.filter(
            (c) =>
              (filter === "all" || (filter === "published" ? c.published_lesson_count > 0 : c.published_lesson_count === 0)) &&
              (!query || c.subject_name.toLowerCase().includes(query) || `class ${c.class_level}`.includes(query)),
          );
          if (visible.length === 0) {
            return <EmptyState icon={BookOpen} title="No courses match" description="Try a different filter or search." />;
          }
          return (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((c) => (
                <CourseCard
                  key={c.subject_id}
                  course={c}
                  onMore={
                    <MoreMenu
                      label={`More actions for ${c.subject_name}`}
                      items={[
                        { label: "Edit content", onSelect: () => navigate(`/teacher/courses/${c.subject_id}/content`) },
                        { label: "Add lesson", onSelect: () => navigate(`/teacher/lessons/new?class=${c.class_level}&subject=${c.subject_id}`) },
                        { label: "Add assignment", onSelect: () => navigate(`/teacher/assignments/new?class=${c.class_level}&subject=${c.subject_id}`) },
                        { label: "View students", onSelect: () => navigate(`/teacher/courses/${c.subject_id}/students`) },
                        { label: "Preview as student", onSelect: () => window.open(`/courses/${c.subject_id}`, "_blank", "noopener") },
                      ]}
                    />
                  }
                />
              ))}
            </div>
          );
        }}
      </QueryView>
    </div>
  );
}
