import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Presentation,
  Settings,
  UserCheck,
  Users,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export interface TeacherNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** exact match only (for /teacher and for parents of other items) */
  exact?: boolean;
}

export interface TeacherNavGroup {
  heading: string | null;
  items: TeacherNavItem[];
}

export const TEACHER_NAV: TeacherNavGroup[] = [
  { heading: null, items: [{ label: "Dashboard", path: "/teacher", icon: LayoutDashboard, exact: true }] },
  {
    heading: "Teaching",
    items: [
      { label: "My Courses", path: "/teacher/courses", icon: BookOpen },
      { label: "Classes", path: "/teacher/classes", icon: Presentation },
      { label: "Assignments", path: "/teacher/assignments", icon: ClipboardCheck },
      { label: "Calendar", path: "/teacher/calendar", icon: CalendarDays },
    ],
  },
  {
    heading: "Students",
    items: [
      { label: "All Students", path: "/teacher/students", icon: Users, exact: true },
      { label: "Needs Attention", path: "/teacher/students/attention", icon: AlertTriangle },
      { label: "Attendance", path: "/teacher/attendance", icon: UserCheck },
    ],
  },
  {
    heading: "Insights",
    items: [
      { label: "Analytics", path: "/teacher/analytics", icon: BarChart3 },
      { label: "Performance", path: "/teacher/performance", icon: Gauge },
    ],
  },
  { heading: "Resources", items: [{ label: "Resource Library", path: "/teacher/resources", icon: FolderOpen }] },
  {
    heading: "Communication",
    items: [
      { label: "Messages", path: "/teacher/messages", icon: MessageSquare },
      { label: "Announcements", path: "/teacher/announcements", icon: Megaphone },
      { label: "Blog", path: "/teacher/blog", icon: NotebookPen },
    ],
  },
  { heading: "System", items: [{ label: "Settings", path: "/teacher/settings", icon: Settings }] },
];

const ALL_ITEMS = TEACHER_NAV.flatMap((g) => g.items.map((item) => ({ ...item, group: g.heading })));

export function isNavActive(pathname: string, item: TeacherNavItem): boolean {
  if (item.exact) {
    // "All Students" also owns student profiles, but not the attention list.
    if (item.path === "/teacher/students") {
      return pathname === item.path || (pathname.startsWith("/teacher/students/") && !pathname.startsWith("/teacher/students/attention"));
    }
    return pathname === item.path;
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

/** Breadcrumb trail for the header: [group, page] from the nav config. */
export function breadcrumbFor(pathname: string): { group: string | null; label: string; path: string } | null {
  if (pathname.startsWith("/teacher/lessons")) return { group: "Teaching", label: "My Courses", path: "/teacher/courses" };
  const item = ALL_ITEMS.find((i) => isNavActive(pathname, i));
  return item ? { group: item.group, label: item.label, path: item.path } : null;
}
