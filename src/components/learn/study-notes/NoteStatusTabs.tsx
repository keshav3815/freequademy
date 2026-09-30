import { STATUS_TABS, type NotesStatus } from "@/lib/studyNotes";
import { cn } from "@/lib/utils";

/**
 * Progress tabs. The data model has no note "type" (formula sheet, revision
 * note, …), so tabs are the real per-student progress states instead.
 */
export default function NoteStatusTabs({ value, onChange }: { value: NotesStatus; onChange: (v: NotesStatus) => void }) {
  return (
    <div role="tablist" aria-label="Filter notes by progress" className="flex gap-1 overflow-x-auto border-b border-border/70">
      {STATUS_TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-md",
              active ? "border-primary font-semibold text-primary" : "border-transparent text-foreground/65 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
