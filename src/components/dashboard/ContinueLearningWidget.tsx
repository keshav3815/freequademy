import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, FileText, ChevronRight, BookOpen, Video, Brain } from "lucide-react";

interface ContinueLearningWidgetProps {
  grade: string;
}

const getContinueLearningData = (grade: string) => {
  const gradeData: Record<string, {
    lastVideo: { title: string; subject: string; progress: number };
    lastQuiz: { title: string; subject: string; questionsLeft: number };
    pendingAssignments: { title: string; dueIn: string }[];
    recommendedNext: { title: string; subject: string; type: string };
  }> = {
    "6": {
      lastVideo: { title: "Introduction to Fractions", subject: "Mathematics", progress: 65 },
      lastQuiz: { title: "Food and Nutrition Quiz", subject: "Science", questionsLeft: 5 },
      pendingAssignments: [
        { title: "English Grammar Exercise", dueIn: "2 days" },
        { title: "Math Practice Set", dueIn: "3 days" },
      ],
      recommendedNext: { title: "Decimals Explained", subject: "Mathematics", type: "Video" },
    },
    "7": {
      lastVideo: { title: "Algebraic Expressions Basics", subject: "Mathematics", progress: 45 },
      lastQuiz: { title: "Heat Transfer Quiz", subject: "Science", questionsLeft: 8 },
      pendingAssignments: [
        { title: "Algebra Worksheet", dueIn: "1 day" },
        { title: "Science Lab Report", dueIn: "4 days" },
      ],
      recommendedNext: { title: "Solving Linear Equations", subject: "Mathematics", type: "Lesson" },
    },
    "8": {
      lastVideo: { title: "Linear Equations in One Variable", subject: "Mathematics", progress: 72 },
      lastQuiz: { title: "Force and Pressure", subject: "Science", questionsLeft: 3 },
      pendingAssignments: [
        { title: "Graph Plotting Assignment", dueIn: "2 days" },
      ],
      recommendedNext: { title: "Quadrilaterals", subject: "Mathematics", type: "Video" },
    },
    "9": {
      lastVideo: { title: "Polynomial Identities", subject: "Mathematics", progress: 55 },
      lastQuiz: { title: "Atomic Structure Quiz", subject: "Science", questionsLeft: 10 },
      pendingAssignments: [
        { title: "Chemistry Numericals", dueIn: "1 day" },
        { title: "English Essay", dueIn: "5 days" },
      ],
      recommendedNext: { title: "Coordinate Geometry", subject: "Mathematics", type: "Lesson" },
    },
    "10": {
      lastVideo: { title: "Quadratic Formula Derivation", subject: "Mathematics", progress: 80 },
      lastQuiz: { title: "Chemical Equations Quiz", subject: "Science", questionsLeft: 4 },
      pendingAssignments: [
        { title: "Trigonometry Practice", dueIn: "2 days" },
        { title: "Physics Numericals", dueIn: "3 days" },
      ],
      recommendedNext: { title: "Arithmetic Progressions", subject: "Mathematics", type: "Video" },
    },
    "11": {
      lastVideo: { title: "Trigonometric Functions", subject: "Mathematics", progress: 60 },
      lastQuiz: { title: "Laws of Motion Quiz", subject: "Physics", questionsLeft: 6 },
      pendingAssignments: [
        { title: "Integration Problems", dueIn: "1 day" },
        { title: "Organic Chemistry Assignment", dueIn: "4 days" },
      ],
      recommendedNext: { title: "Limits and Derivatives", subject: "Mathematics", type: "Lesson" },
    },
    "12": {
      lastVideo: { title: "Definite Integrals", subject: "Mathematics", progress: 40 },
      lastQuiz: { title: "Electromagnetic Induction", subject: "Physics", questionsLeft: 7 },
      pendingAssignments: [
        { title: "Board Exam Practice Paper", dueIn: "1 day" },
        { title: "Chemistry Revision Test", dueIn: "2 days" },
      ],
      recommendedNext: { title: "Differential Equations", subject: "Mathematics", type: "Video" },
    },
  };
  return gradeData[grade] || gradeData["10"];
};

export default function ContinueLearningWidget({ grade }: ContinueLearningWidgetProps) {
  const data = getContinueLearningData(grade);

  return (
    <Card className="p-6 animate-fade-in">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Play className="h-5 w-5 text-primary" />
        Continue Learning
      </h2>
      
      <div className="space-y-4">
        {/* Last Watched Video */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Last Watched</span>
            </div>
            <Badge variant="outline" className="text-xs">{data.lastVideo.subject}</Badge>
          </div>
          <h3 className="font-medium mb-2">{data.lastVideo.title}</h3>
          <div className="flex items-center gap-3">
            <Progress value={data.lastVideo.progress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground">{data.lastVideo.progress}%</span>
          </div>
          <Button size="sm" variant="gradient" className="mt-3 w-full">
            <Play className="h-3 w-3 mr-1" /> Resume Video
          </Button>
        </div>

        {/* Last Quiz */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-secondary" />
              <span className="text-xs text-muted-foreground">Pending Quiz</span>
            </div>
            <Badge variant="secondary" className="text-xs">{data.lastQuiz.questionsLeft} left</Badge>
          </div>
          <h3 className="font-medium">{data.lastQuiz.title}</h3>
          <p className="text-sm text-muted-foreground">{data.lastQuiz.subject}</p>
          <Button size="sm" variant="outline" className="mt-3 w-full">
            Continue Quiz <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Pending Assignments */}
        {data.pendingAssignments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Pending Assignments
            </h4>
            {data.pendingAssignments.map((assignment, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <span className="text-sm">{assignment.title}</span>
                <Badge variant="destructive" className="text-xs">Due in {assignment.dueIn}</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Recommended Next */}
        <div className="p-4 border-2 border-dashed border-primary/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs text-primary font-medium">Recommended Next</span>
          </div>
          <h3 className="font-medium">{data.recommendedNext.title}</h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted-foreground">{data.recommendedNext.subject}</span>
            <Badge>{data.recommendedNext.type}</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
