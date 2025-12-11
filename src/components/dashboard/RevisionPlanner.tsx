import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Bell, 
  BookOpen, 
  ChevronRight, 
  Clock,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface RevisionPlannerProps {
  grade: string;
}

const getRevisionSchedule = (grade: string) => {
  const schedules: Record<string, {
    today: { topic: string; subject: string; duration: string; priority: string }[];
    upcoming: { topic: string; subject: string; dueDate: string; status: string }[];
    alerts: { message: string; type: string }[];
  }> = {
    "6": {
      today: [
        { topic: "Decimals Revision", subject: "Mathematics", duration: "30 mins", priority: "high" },
        { topic: "Living Things Review", subject: "Science", duration: "25 mins", priority: "medium" },
      ],
      upcoming: [
        { topic: "Fractions Chapter Test", subject: "Mathematics", dueDate: "Tomorrow", status: "pending" },
        { topic: "Grammar Rules", subject: "English", dueDate: "In 3 days", status: "scheduled" },
      ],
      alerts: [
        { message: "Chapter test on Fractions tomorrow!", type: "warning" },
      ],
    },
    "10": {
      today: [
        { topic: "Quadratic Equations Practice", subject: "Mathematics", duration: "45 mins", priority: "high" },
        { topic: "Chemical Reactions Review", subject: "Science", duration: "30 mins", priority: "medium" },
      ],
      upcoming: [
        { topic: "Trigonometry Unit Test", subject: "Mathematics", dueDate: "In 2 days", status: "pending" },
        { topic: "Life Processes", subject: "Biology", dueDate: "In 4 days", status: "scheduled" },
        { topic: "Electricity Chapter", subject: "Physics", dueDate: "In 5 days", status: "scheduled" },
      ],
      alerts: [
        { message: "Trigonometry test in 2 days - 3 weak areas identified", type: "warning" },
        { message: "You're on track with Chemistry!", type: "success" },
      ],
    },
    "11": {
      today: [
        { topic: "Limits and Derivatives", subject: "Mathematics", duration: "50 mins", priority: "high" },
        { topic: "Laws of Motion Problems", subject: "Physics", duration: "40 mins", priority: "high" },
      ],
      upcoming: [
        { topic: "Trigonometric Functions Test", subject: "Mathematics", dueDate: "Tomorrow", status: "pending" },
        { topic: "Chemical Bonding", subject: "Chemistry", dueDate: "In 3 days", status: "scheduled" },
      ],
      alerts: [
        { message: "Important: Complete Trigonometry revision today!", type: "warning" },
      ],
    },
    "12": {
      today: [
        { topic: "Integration Techniques", subject: "Mathematics", duration: "60 mins", priority: "high" },
        { topic: "Electromagnetic Induction", subject: "Physics", duration: "45 mins", priority: "high" },
      ],
      upcoming: [
        { topic: "Board Exam Practice Paper 1", subject: "Mathematics", dueDate: "In 2 days", status: "pending" },
        { topic: "Organic Chemistry Reactions", subject: "Chemistry", dueDate: "In 4 days", status: "scheduled" },
      ],
      alerts: [
        { message: "Board exam preparation: 45 days remaining", type: "warning" },
        { message: "Complete 2 practice papers this week", type: "info" },
      ],
    },
  };
  return schedules[grade] || schedules["10"];
};

export default function RevisionPlanner({ grade }: RevisionPlannerProps) {
  const schedule = getRevisionSchedule(grade);

  const priorityColors: Record<string, string> = {
    high: "bg-red-500/10 text-red-500 border-red-500/30",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    low: "bg-green-500/10 text-green-500 border-green-500/30",
  };

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Revision Planner
        </h2>
        <Button variant="ghost" size="sm">
          Full Schedule <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Alerts */}
      {schedule.alerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {schedule.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                alert.type === "warning"
                  ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/30"
                  : alert.type === "success"
                  ? "bg-green-500/10 text-green-600 border border-green-500/30"
                  : "bg-blue-500/10 text-blue-600 border border-blue-500/30"
              }`}
            >
              {alert.type === "warning" ? (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              )}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Today's Revision */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Today's Revision
        </h3>
        <div className="space-y-3">
          {schedule.today.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">{item.topic}</p>
                  <p className="text-xs text-muted-foreground">{item.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{item.duration}</span>
                <Badge className={`text-xs ${priorityColors[item.priority]}`}>
                  {item.priority}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Upcoming Tests & Revisions
        </h3>
        <div className="space-y-2">
          {schedule.upcoming.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 border border-border/50 rounded-lg"
            >
              <div>
                <p className="font-medium text-sm">{item.topic}</p>
                <p className="text-xs text-muted-foreground">{item.subject}</p>
              </div>
              <div className="text-right">
                <Badge variant={item.status === "pending" ? "destructive" : "secondary"} className="text-xs">
                  {item.dueDate}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button variant="outline" className="w-full mt-4">
        Customize Schedule
      </Button>
    </Card>
  );
}
