import { CalendarDays, Star, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

const stats: StatItem[] = [
  {
    label: "Sessions This Month",
    value: 18,
    icon: <CalendarDays className="h-5 w-5" />,
    trend: "+3 from last month",
    trendUp: true,
  },
  {
    label: "Avg Rating",
    value: "4.7",
    icon: <Star className="h-5 w-5 text-yellow-500" />,
    trend: "⭐ Excellent",
    trendUp: true,
  },
  {
    label: "Pending Doubts",
    value: 3,
    icon: <MessageSquare className="h-5 w-5 text-orange-500" />,
    trend: "Reply within 2hrs",
    trendUp: false,
  },
  {
    label: "Students Helped",
    value: 42,
    icon: <Users className="h-5 w-5 text-green-500" />,
    trend: "+8 this week",
    trendUp: true,
  },
];

export default function TeacherStats() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {stat.icon}
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.trend && (
                <p
                  className={`text-xs mt-1 ${
                    stat.trendUp ? "text-green-500" : "text-muted-foreground"
                  }`}
                >
                  {stat.trend}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
