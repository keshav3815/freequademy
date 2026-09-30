import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";

type ReviewRow = Database["public"]["Functions"]["get_attempt_review"]["Returns"][number];

/**
 * Per-question review (correct answer + explanation), shared by the
 * just-submitted flow (TakeTest.tsx) and the standalone past-attempt review
 * page (AttemptReview.tsx) so the two never drift apart.
 */
export default function TestReviewList({ review }: { review: ReviewRow[] }) {
  return (
    <>
      {review.map((q, idx) => (
        <Card key={q.question_id}>
          <CardContent className="pt-6 space-y-3">
            <p className="font-medium flex items-start gap-2">
              {q.is_correct ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" aria-label="Correct" /> : <XCircle className="h-5 w-5 text-red-600 shrink-0" aria-label="Incorrect" />}
              <span>{idx + 1}. {q.prompt}</span>
            </p>
            <ul className="space-y-1 text-sm">
              {((q.options as string[]) ?? []).map((opt, i) => (
                <li
                  key={i}
                  className={`rounded border px-3 py-2 ${i === q.correct_option ? "border-green-600 bg-green-600/10" : i === q.selected_option ? "border-red-600 bg-red-600/10" : ""}`}
                >
                  {opt}
                  {i === q.correct_option && " ✓"}
                  {i === q.selected_option && i !== q.correct_option && " (your answer)"}
                </li>
              ))}
            </ul>
            {q.selected_option === null && <p className="text-sm text-muted-foreground">Not answered</p>}
            {q.explanation && <p className="text-sm bg-muted/50 rounded p-3"><span className="font-medium">Explanation: </span>{q.explanation}</p>}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
