import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Video, 
  FileText, 
  Bell,
  ArrowRight
} from "lucide-react";

interface UpcomingScheduleProps {
  grade: string;
}

const getScheduleByGrade = (grade: string) => {
  const schedules: Record<string, typeof defaultSchedule> = {
    "10": [
      { type: "test", title: "Math Unit Test", time: "Tomorrow, 10:00 AM", subject: "Mathematics", icon: FileText },
      { type: "class", title: "Live Class: Trigonometry", time: "Today, 4:00 PM", subject: "Mathematics", icon: Video },
      { type: "revision", title: "Science Revision", time: "Dec 14, 2:00 PM", subject: "Science", icon: Bell },
    ],
    "11": [
      { type: "test", title: "Physics Mock Test", time: "Tomorrow, 10:00 AM", subject: "Physics", icon: FileText },
      { type: "class", title: "Live Class: Calculus", time: "Today, 4:00 PM", subject: "Mathematics", icon: Video },
      { type: "revision", title: "Chemistry Revision", time: "Dec 14, 2:00 PM", subject: "Chemistry", icon: Bell },
    ],
    "12": [
      { type: "test", title: "Board Prep Test", time: "Tomorrow, 10:00 AM", subject: "All Subjects", icon: FileText },
      { type: "class", title: "Live Class: Integration", time: "Today, 4:00 PM", subject: "Mathematics", icon: Video },
      { type: "revision", title: "Physics Revision", time: "Dec 14, 2:00 PM", subject: "Physics", icon: Bell },
    ],
  };
  return schedules[grade] || schedules["10"];
};

const defaultSchedule = [
  { type: "test", title: "Math Unit Test", time: "Tomorrow, 10:00 AM", subject: "Mathematics", icon: FileText },
  { type: "class", title: "Live Class: Algebra", time: "Today, 4:00 PM", subject: "Mathematics", icon: Video },
  { type: "revision", title: "Science Revision", time: "Dec 14, 2:00 PM", subject: "Science", icon: Bell },
];

export default function UpcomingSchedule({ grade }: UpcomingScheduleProps) {
  const schedule = getScheduleByGrade(grade);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "test":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "class":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "revision":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Calendar className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold">Upcoming Schedule</h3>
            <p className="text-xs text-muted-foreground">Tests, classes & revisions</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {schedule.length} events
        </Badge>
      </div>

      <div className="space-y-3">
        {schedule.map((item, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border transition-all hover:scale-[1.02] cursor-pointer ${getTypeStyles(item.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background/80">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{item.time}</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {item.subject}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full mt-4 text-sm" size="sm">
        View Full Calendar <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </Card>
  );
}
