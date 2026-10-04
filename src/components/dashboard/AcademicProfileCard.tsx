import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { currentAcademicYear } from "@/lib/academicYear";
import type { SubjectPerformancePoint } from "./charts/SubjectPerformanceChart";

interface Props {
  grade: string | null;
  subjects: Pick<SubjectPerformancePoint, "subject_id" | "subject_name">[];
}

/**
 * Class, academic year, and the real subjects for that class — no invented
 * "stream" (there is no student-level stream field in the schema; class
 * 11–12 subjects span both science and commerce and nothing restricts a
 * student to one, so showing a stream would be fabricated).
 */
export default function AcademicProfileCard({ grade, subjects }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10"><GraduationCap className="h-5 w-5 text-primary" /></div>
        <h3 className="font-semibold">Academic Profile</h3>
      </div>

      {!grade ? (
        <div className="text-sm text-muted-foreground space-y-3">
          <p>Your class isn't set yet, so we can't show your real subjects.</p>
          <Button asChild size="sm"><Link to="/courses">Browse all classes</Link></Button>
        </div>
      ) : (
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Class</dt>
            <dd className="font-medium">{grade}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Academic Year</dt>
            <dd className="font-medium">{currentAcademicYear()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1.5">Subjects</dt>
            <dd className="flex flex-wrap gap-1.5">
              {subjects.length === 0 ? (
                <span className="text-muted-foreground">No subjects published for this class yet.</span>
              ) : (
                subjects.map((s) => (
                  <Link key={s.subject_id} to={`/my-courses/${s.subject_id}`}>
                    <Badge variant="secondary" className="hover:bg-primary/10 hover:text-primary transition-colors">
                      {s.subject_name}
                    </Badge>
                  </Link>
                ))
              )}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
