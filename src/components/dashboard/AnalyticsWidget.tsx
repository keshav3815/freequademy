import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Clock,
  BookOpen,
  CheckCircle2
} from "lucide-react";

interface AnalyticsWidgetProps {
  grade: string;
}

export default function AnalyticsWidget({ grade }: AnalyticsWidgetProps) {
  const weeklyStats = {
    studyTime: { current: 12.5, previous: 10, unit: "hrs" },
    lessonsCompleted: { current: 18, previous: 15, unit: "" },
    quizzesTaken: { current: 8, previous: 6, unit: "" },
    avgScore: { current: 87, previous: 82, unit: "%" },
  };

  const subjectPerformance = [
    { subject: "Mathematics", score: 85, trend: "up" },
    { subject: "Science", score: 78, trend: "down" },
    { subject: "English", score: 92, trend: "up" },
    { subject: "Social Studies", score: 88, trend: "up" },
  ];

  const calculateTrend = (current: number, previous: number) => {
    const diff = ((current - previous) / previous) * 100;
    return { value: Math.abs(diff).toFixed(0), isPositive: diff >= 0 };
  };

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold">Weekly Analytics</h3>
            <p className="text-xs text-muted-foreground">Your performance this week</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {(() => {
              const trend = calculateTrend(weeklyStats.studyTime.current, weeklyStats.studyTime.previous);
              return (
                <Badge variant="outline" className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {trend.value}%
                </Badge>
              );
            })()}
          </div>
          <p className="text-lg font-bold">{weeklyStats.studyTime.current}h</p>
          <p className="text-xs text-muted-foreground">Study Time</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            {(() => {
              const trend = calculateTrend(weeklyStats.lessonsCompleted.current, weeklyStats.lessonsCompleted.previous);
              return (
                <Badge variant="outline" className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {trend.value}%
                </Badge>
              );
            })()}
          </div>
          <p className="text-lg font-bold">{weeklyStats.lessonsCompleted.current}</p>
          <p className="text-xs text-muted-foreground">Lessons Done</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            {(() => {
              const trend = calculateTrend(weeklyStats.quizzesTaken.current, weeklyStats.quizzesTaken.previous);
              return (
                <Badge variant="outline" className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {trend.value}%
                </Badge>
              );
            })()}
          </div>
          <p className="text-lg font-bold">{weeklyStats.quizzesTaken.current}</p>
          <p className="text-xs text-muted-foreground">Quizzes Taken</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <Target className="h-4 w-4 text-muted-foreground" />
            {(() => {
              const trend = calculateTrend(weeklyStats.avgScore.current, weeklyStats.avgScore.previous);
              return (
                <Badge variant="outline" className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {trend.value}%
                </Badge>
              );
            })()}
          </div>
          <p className="text-lg font-bold">{weeklyStats.avgScore.current}%</p>
          <p className="text-xs text-muted-foreground">Avg Score</p>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="pt-3 border-t">
        <p className="text-xs font-medium text-muted-foreground mb-3">Subject Performance</p>
        <div className="space-y-3">
          {subjectPerformance.map((subject, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{subject.subject}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{subject.score}%</span>
                  {subject.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </div>
              </div>
              <Progress 
                value={subject.score} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
