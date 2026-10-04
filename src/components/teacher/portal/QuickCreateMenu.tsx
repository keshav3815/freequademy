import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronDown, ClipboardCheck, FileText, FolderOpen, Megaphone, Plus, Presentation } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TButton } from "./ui";

/** The one quick-create menu, used in the header and on the dashboard. */
const QUICK_CREATE = [
  { label: "Course", description: "Start teaching a subject", to: "/teacher/courses/new", icon: BookOpen },
  { label: "Lesson", description: "Notes and/or video", to: "/teacher/lessons/new", icon: FileText },
  { label: "Assignment", description: "Quiz or test for students", to: "/teacher/assignments/new", icon: ClipboardCheck },
  { label: "Class", description: "Schedule a live session", to: "/teacher/classes?new=1", icon: Presentation },
  { label: "Announcement", description: "Message a course or class", to: "/teacher/announcements?new=1", icon: Megaphone },
  { label: "Resource", description: "Upload a file or link", to: "/teacher/resources?new=1", icon: FolderOpen },
] as const;

export default function QuickCreateMenu({ align = "end", compact }: { align?: "start" | "end"; compact?: boolean }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TButton size={compact ? "icon" : "md"} aria-label={compact ? "Create" : undefined}>
          <Plus />
          {!compact && (
            <>
              Create
              <ChevronDown className="-mr-1 opacity-70" />
            </>
          )}
        </TButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64 rounded-lg p-1.5">
        <DropdownMenuLabel className="px-2 text-[12px] font-medium text-muted-foreground">Create new</DropdownMenuLabel>
        {QUICK_CREATE.map((item) => (
          <DropdownMenuItem key={item.label} onSelect={() => navigate(item.to)} className="cursor-pointer gap-3 rounded-md px-2 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[14px] font-medium">{item.label}</span>
              <span className="block text-[12px] text-muted-foreground">{item.description}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
