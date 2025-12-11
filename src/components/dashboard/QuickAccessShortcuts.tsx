import { Card } from "@/components/ui/card";
import { 
  FileText, 
  Video, 
  Sparkles, 
  Brain, 
  ClipboardList,
  ChevronRight 
} from "lucide-react";
import { Link } from "react-router-dom";

const shortcuts = [
  {
    icon: FileText,
    label: "My Notes",
    description: "Access saved notes",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    href: "/notes",
  },
  {
    icon: Video,
    label: "Videos",
    description: "Video lessons",
    color: "bg-red-500/10 text-red-500 border-red-500/20",
    href: "/courses",
  },
  {
    icon: Sparkles,
    label: "Animated",
    description: "Interactive lessons",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    href: "/courses",
  },
  {
    icon: Brain,
    label: "Quizzes",
    description: "Practice tests",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
    href: "/mock-tests",
  },
  {
    icon: ClipboardList,
    label: "Test Series",
    description: "Full mock tests",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    href: "/mock-tests",
  },
];

export default function QuickAccessShortcuts() {
  return (
    <Card className="p-6 animate-fade-in">
      <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {shortcuts.map((shortcut, index) => (
          <Link
            key={index}
            to={shortcut.href}
            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg ${shortcut.color}`}
          >
            <shortcut.icon className="h-8 w-8 mb-2" />
            <span className="font-medium text-sm text-center">{shortcut.label}</span>
            <span className="text-xs text-muted-foreground text-center mt-1">{shortcut.description}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
