import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Sparkles,
  ChevronRight,
  BarChart3,
  AlertTriangle
} from "lucide-react";

interface SmartTestsProps {
  grade: string;
}

const getSmartTestsData = (grade: string) => {
  const tests: Record<string, {
    weaknessTests: { topic: string; subject: string; accuracy: number; questions: number }[];
    adaptiveQuizzes: { title: string; difficulty: string; estimatedTime: string; xpReward: number }[];
    weeklyGoal: { completed: number; total: number };
  }> = {
    "6": {
      weaknessTests: [
        { topic: "Decimals", subject: "Mathematics", accuracy: 45, questions: 10 },
        { topic: "Light & Shadows", subject: "Science", accuracy: 52, questions: 8 },
      ],
      adaptiveQuizzes: [
        { title: "Mixed Fraction Challenge", difficulty: "Medium", estimatedTime: "10 mins", xpReward: 30 },
        { title: "Quick Science Recall", difficulty: "Easy", estimatedTime: "5 mins", xpReward: 15 },
      ],
      weeklyGoal: { completed: 3, total: 5 },
    },
    "10": {
      weaknessTests: [
        { topic: "Statistics & Probability", subject: "Mathematics", accuracy: 48, questions: 15 },
        { topic: "Magnetic Effects", subject: "Physics", accuracy: 55, questions: 12 },
        { topic: "Consumer Rights", subject: "Social Science", accuracy: 60, questions: 10 },
      ],
      adaptiveQuizzes: [
        { title: "Quadratic Mastery Test", difficulty: "Hard", estimatedTime: "20 mins", xpReward: 50 },
        { title: "Chemical Equations Sprint", difficulty: "Medium", estimatedTime: "12 mins", xpReward: 35 },
        { title: "Quick Trigonometry Recall", difficulty: "Easy", estimatedTime: "8 mins", xpReward: 20 },
      ],
      weeklyGoal: { completed: 4, total: 7 },
    },
    "11": {
      weaknessTests: [
        { topic: "Permutations & Combinations", subject: "Mathematics", accuracy: 42, questions: 15 },
        { topic: "Rotational Motion", subject: "Physics", accuracy: 50, questions: 12 },
        { topic: "Thermodynamics", subject: "Chemistry", accuracy: 55, questions: 10 },
      ],
      adaptiveQuizzes: [
        { title: "Limits Deep Dive", difficulty: "Hard", estimatedTime: "25 mins", xpReward: 60 },
        { title: "Newton's Laws Challenge", difficulty: "Medium", estimatedTime: "15 mins", xpReward: 40 },
      ],
      weeklyGoal: { completed: 5, total: 8 },
    },
    "12": {
      weaknessTests: [
        { topic: "Differential Equations", subject: "Mathematics", accuracy: 40, questions: 20 },
        { topic: "Semiconductors", subject: "Physics", accuracy: 48, questions: 15 },
        { topic: "Coordination Compounds", subject: "Chemistry", accuracy: 52, questions: 12 },
      ],
      adaptiveQuizzes: [
        { title: "Board Exam Pattern Test", difficulty: "Hard", estimatedTime: "30 mins", xpReward: 80 },
        { title: "Integration Marathon", difficulty: "Hard", estimatedTime: "25 mins", xpReward: 60 },
        { title: "Quick Chemistry Recall", difficulty: "Medium", estimatedTime: "15 mins", xpReward: 40 },
      ],
      weeklyGoal: { completed: 6, total: 10 },
    },
  };
  return tests[grade] || tests["10"];
};

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/10 text-green-500 border-green-500/30",
  Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  Hard: "bg-red-500/10 text-red-500 border-red-500/30",
};

export default function SmartTests({ grade }: SmartTestsProps) {
  const data = getSmartTestsData(grade);
  const goalProgress = (data.weeklyGoal.completed / data.weeklyGoal.total) * 100;

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Smart Tests
        </h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI Powered
        </Badge>
      </div>

      {/* Weekly Goal */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Weekly Test Goal</span>
          <span className="text-sm text-muted-foreground">
            {data.weeklyGoal.completed}/{data.weeklyGoal.total} completed
          </span>
        </div>
        <Progress value={goalProgress} className="h-2 mb-2" />
        <p className="text-xs text-muted-foreground">
          {data.weeklyGoal.total - data.weeklyGoal.completed} more tests to reach your weekly goal!
        </p>
      </div>

      {/* Weakness-based Tests */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Improve Weak Areas
        </h3>
        <div className="space-y-3">
          {data.weaknessTests.map((test, idx) => (
            <div
              key={idx}
              className="p-4 border border-orange-500/30 bg-orange-500/5 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{test.topic}</p>
                  <p className="text-xs text-muted-foreground">{test.subject}</p>
                </div>
                <Badge variant="destructive" className="text-xs">
                  {test.accuracy}% accuracy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{test.questions} questions</span>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Practice Now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adaptive Quizzes */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Adaptive Quizzes
        </h3>
        <div className="space-y-2">
          {data.adaptiveQuizzes.map((quiz, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all cursor-pointer"
            >
              <div>
                <p className="font-medium text-sm">{quiz.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${difficultyColors[quiz.difficulty]}`}>
                    {quiz.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{quiz.estimatedTime}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-primary">+{quiz.xpReward} XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button variant="gradient" className="w-full mt-4">
        <BarChart3 className="h-4 w-4 mr-2" />
        View Full Analytics
      </Button>
    </Card>
  );
}
