import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORT_LABEL, type NotesSort } from "@/lib/studyNotes";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  sort: NotesSort;
  onSortChange: (s: NotesSort) => void;
  chapters?: { id: string; title: string }[];
  chapterId?: string | null;
  onChapterChange?: (id: string | null) => void;
}

export default function NotesToolbar({ query, onQueryChange, sort, onSortChange, chapters, chapterId, onChapterChange }: Props) {
  const [text, setText] = useState(query);
  useEffect(() => setText(query), [query]);
  useEffect(() => {
    if (text === query) return;
    const t = window.setTimeout(() => onQueryChange(text), 300);
    return () => window.clearTimeout(t);
  }, [text, query, onQueryChange]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row" role="search">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" aria-hidden="true" />
        <Input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search notes, chapters, topics..."
          aria-label="Search Study Notes"
          maxLength={80}
          className="h-11 rounded-xl bg-card pl-11 pr-10 shadow-sm"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText("");
              onQueryChange("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex gap-3">
        {chapters && onChapterChange && (
          <Select value={chapterId ?? "all"} onValueChange={(v) => onChapterChange(v === "all" ? null : v)}>
            <SelectTrigger className="h-11 w-full rounded-xl bg-card lg:w-48" aria-label="Filter by chapter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All chapters</SelectItem>
              {chapters.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => onSortChange(v as NotesSort)}>
          <SelectTrigger className="h-11 w-full rounded-xl bg-card lg:w-48" aria-label="Sort notes"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABEL) as NotesSort[]).map((s) => <SelectItem key={s} value={s}>{SORT_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
