import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOTES_PAGE_SIZE } from "@/lib/studyNotes";

export default function NotesGrid({ children, page, total, onPageChange, paged = true }: {
  children: ReactNode;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  paged?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / NOTES_PAGE_SIZE));
  const from = (page - 1) * NOTES_PAGE_SIZE + 1;
  const to = Math.min(total, page * NOTES_PAGE_SIZE);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div>
      {paged && pages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Notes pages">
          <p className="text-sm text-foreground/65">Showing {from}–{to} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
