import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Calculator,
  Atom,
  BookText,
  Beaker,
  Globe
} from "lucide-react";

interface SubjectProgressProps {
  grade: string;
}

const getSubjectsByGrade = (grade: string) => {
  const subjects: Record<string, {
    name: string;
    icon: any;
    color: string;
    progress: number;
    chaptersCompleted: number;
    totalChapters: number;
    weakTopics: string[];
    strongTopics: string[];
  }[]> = {
    "6": [
      { name: "Mathematics", icon: Calculator, color: "text-blue-500", progress: 72, chaptersCompleted: 8, totalChapters: 12, weakTopics: ["Decimals"], strongTopics: ["Integers", "Basic Algebra"] },
      { name: "Science", icon: Atom, color: "text-green-500", progress: 65, chaptersCompleted: 6, totalChapters: 10, weakTopics: ["Light"], strongTopics: ["Living Things"] },
      { name: "English", icon: BookText, color: "text-purple-500", progress: 80, chaptersCompleted: 10, totalChapters: 12, weakTopics: [], strongTopics: ["Grammar", "Vocabulary"] },
    ],
    "7": [
      { name: "Mathematics", icon: Calculator, color: "text-blue-500", progress: 68, chaptersCompleted: 7, totalChapters: 12, weakTopics: ["Rational Numbers"], strongTopics: ["Integers", "Lines and Angles"] },
      { name: "Science", icon: Atom, color: "text-green-500", progress: 75, chaptersCompleted: 8, totalChapters: 11, weakTopics: ["Acids and Bases"], strongTopics: ["Heat", "Motion"] },
      { name: "English", icon: BookText, color: "text-purple-500", progress: 82, chaptersCompleted: 9, totalChapters: 11, weakTopics: [], strongTopics: ["Tenses", "Comprehension"] },
    ],
    "8": [
      { name: "Mathematics", icon: Calculator, color: "text-blue-500", progress: 70, chaptersCompleted: 9, totalChapters: 14, weakTopics: ["Quadrilaterals"], strongTopics: ["Linear Equations", "Squares"] },
      { name: "Science", icon: Atom, color: "text-green-500", progress: 78, chaptersCompleted: 10, totalChapters: 13, weakTopics: ["Sound"], strongTopics: ["Force", "Friction"] },
      { name: "Social Science", icon: Globe, color: "text-orange-500", progress: 65, chaptersCompleted: 8, totalChapters: 12, weakTopics: ["Geography"], strongTopics: ["History"] },
    ],
    "9": [
      { name: "Mathematics", icon: Calculator, color: "text-blue-500", progress: 75, chaptersCompleted: 10, totalChapters: 15, weakTopics: ["Surface Areas"], strongTopics: ["Polynomials", "Triangles"] },
      { name: "Science", icon: Atom, color: "text-green-500", progress: 70, chaptersCompleted: 9, totalChapters: 14, weakTopics: ["Gravity"], strongTopics: ["Atoms", "Tissues"] },
      { name: "Social Science", icon: Globe, color: "text-orange-500", progress: 68, chaptersCompleted: 11, totalChapters: 16, weakTopics: ["Economics"], strongTopics: ["French Revolution"] },
    ],
    "10": [
      { name: "Mathematics", icon: Calculator, color: "text-blue-500", progress: 78, chaptersCompleted: 11, totalChapters: 15, weakTopics: ["Statistics"], strongTopics: ["Quadratic Equations", "Trigonometry"] },
      { name: "Science", icon: Atom, color: "text-green-500", progress: 72, chaptersCompleted: 10, totalChapters: 16, weakTopics: ["Magnetic Effects"], strongTopics: ["Chemical Reactions", "Life Processes"] },
      { name: "Social Science", icon: Globe, color: "text-orange-500", progress: 70, chaptersCompleted: 14, totalChapters: 20, weakTopics: ["Consumer Rights"], strongTopics: ["Nationalism", "Resources"] },
    ],
    "11": [
      { name: "Mathematics", icon: Calculator, color: "text-blue-500", progress: 65, chaptersCompleted: 8, totalChapters: 16, weakTopics: ["Permutations", "Limits"], strongTopics: ["Sets", "Trigonometry"] },
      { name: "Physics", icon: Atom, color: "text-green-500", progress: 60, chaptersCompleted: 7, totalChapters: 15, weakTopics: ["Rotational Motion"], strongTopics: ["Units", "Motion"] },
      { name: "Chemistry", icon: Beaker, color: "text-red-500", progress: 70, chaptersCompleted: 9, totalChapters: 14, weakTopics: ["Thermodynamics"], strongTopics: ["Atomic Structure", "Bonding"] },
    ],
    "12": [
      { name: "Mathematics", icon: Calculator, color: "text-blue-500", progress: 60, chaptersCompleted: 7, totalChapters: 13, weakTopics: ["Differential Equations"], strongTopics: ["Matrices", "Integrals"] },
      { name: "Physics", icon: Atom, color: "text-green-500", progress: 55, chaptersCompleted: 6, totalChapters: 14, weakTopics: ["Semiconductors"], strongTopics: ["Electrostatics", "Optics"] },
      { name: "Chemistry", icon: Beaker, color: "text-red-500", progress: 68, chaptersCompleted: 10, totalChapters: 16, weakTopics: ["Coordination Compounds"], strongTopics: ["Solutions", "Electrochemistry"] },
    ],
  };
  return subjects[grade] || subjects["10"];
};

export default function SubjectProgress({ grade }: SubjectProgressProps) {
  const subjects = getSubjectsByGrade(grade);

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Subject Progress
        </h2>
        <Button variant="ghost" size="sm">
          View All <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-4">
        {subjects.map((subject, index) => (
          <div 
            key={index} 
            className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background ${subject.color}`}>
                  <subject.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{subject.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {subject.chaptersCompleted}/{subject.totalChapters} chapters completed
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold">{subject.progress}%</span>
            </div>

            <Progress value={subject.progress} className="h-2 mb-3" />

            <div className="flex flex-wrap gap-2">
              {subject.weakTopics.length > 0 && subject.weakTopics.map((topic, idx) => (
                <Badge key={idx} variant="destructive" className="text-xs flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {topic}
                </Badge>
              ))}
              {subject.strongTopics.slice(0, 2).map((topic, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
