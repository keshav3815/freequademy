import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Clock, 
  Target, 
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle 
} from "lucide-react";

const mockTests = {
  practice: [
    { id: 1, title: "Mathematics - Chapter 1", questions: 30, time: 45, difficulty: "Easy", attempts: 2 },
    { id: 2, title: "Science - Physics Basics", questions: 25, time: 30, difficulty: "Medium", attempts: 1 },
    { id: 3, title: "English - Grammar", questions: 40, time: 40, difficulty: "Easy", attempts: 3 },
  ],
  chapter: [
    { id: 4, title: "Quadratic Equations", questions: 50, time: 60, difficulty: "Hard", attempts: 0 },
    { id: 5, title: "Chemical Reactions", questions: 45, time: 55, difficulty: "Medium", attempts: 1 },
    { id: 6, title: "World History", questions: 35, time: 40, difficulty: "Medium", attempts: 0 },
  ],
  full: [
    { id: 7, title: "Class 10 - Full Mathematics", questions: 100, time: 180, difficulty: "Hard", attempts: 0 },
    { id: 8, title: "Class 10 - Full Science", questions: 90, time: 150, difficulty: "Hard", attempts: 0 },
  ]
};

const sampleQuestions = [
  {
    id: 1,
    question: "What is the value of x if 2x + 5 = 15?",
    options: ["x = 5", "x = 10", "x = 7.5", "x = 20"],
    correct: 0,
    explanation: "Solving: 2x + 5 = 15, 2x = 10, x = 5"
  },
  {
    id: 2,
    question: "Which of the following is a prime number?",
    options: ["21", "23", "25", "27"],
    correct: 1,
    explanation: "23 is only divisible by 1 and itself, making it prime"
  },
];

export default function MockTests() {
  const [activeTab, setActiveTab] = useState("practice");
  const [showDemo, setShowDemo] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case "Easy": return "text-success";
      case "Medium": return "text-secondary";
      case "Hard": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const handleAnswer = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 animate-slide-up">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Mock <span className="bg-gradient-primary bg-clip-text text-transparent">Tests</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Practice with timed tests and get instant feedback
            </p>
          </div>

          {!showDemo ? (
            <>
              <div className="flex justify-center mb-8">
                <Button variant="gradient" onClick={() => setShowDemo(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Try Demo Test
                </Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
                <TabsList className="grid w-full md:w-[400px] mx-auto grid-cols-3">
                  <TabsTrigger value="practice">Practice</TabsTrigger>
                  <TabsTrigger value="chapter">Chapter-wise</TabsTrigger>
                  <TabsTrigger value="full">Full Tests</TabsTrigger>
                </TabsList>

                {Object.entries(mockTests).map(([key, tests]) => (
                  <TabsContent key={key} value={key} className="mt-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tests.map((test, index) => (
                        <Card 
                          key={test.id}
                          className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-scale-in"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-lg">{test.title}</h3>
                            <Badge className={getDifficultyColor(test.difficulty)}>
                              {test.difficulty}
                            </Badge>
                          </div>

                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Target className="h-4 w-4" />
                              <span>{test.questions} Questions</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{test.time} Minutes</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <TrendingUp className="h-4 w-4" />
                              <span>{test.attempts} Attempts</span>
                            </div>
                          </div>

                          <Button variant={test.attempts > 0 ? "outline" : "gradient"} className="w-full">
                            {test.attempts > 0 ? "Retake Test" : "Start Test"}
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          ) : (
            <Card className="max-w-3xl mx-auto p-8 animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Demo Test</h2>
                <Badge variant="secondary">
                  Question {currentQuestion + 1}/{sampleQuestions.length}
                </Badge>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">
                  {sampleQuestions[currentQuestion].question}
                </h3>

                <div className="space-y-3">
                  {sampleQuestions[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={showResult}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        showResult
                          ? index === sampleQuestions[currentQuestion].correct
                            ? "border-success bg-success/10"
                            : index === selectedAnswer
                            ? "border-destructive bg-destructive/10"
                            : "border-border"
                          : "border-border hover:border-primary hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {showResult && (
                          <>
                            {index === sampleQuestions[currentQuestion].correct && (
                              <CheckCircle className="h-5 w-5 text-success" />
                            )}
                            {index === selectedAnswer && index !== sampleQuestions[currentQuestion].correct && (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {showResult && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Explanation:</p>
                        <p className="text-sm text-muted-foreground">
                          {sampleQuestions[currentQuestion].explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setShowDemo(false)}>
                  Exit Test
                </Button>
                {showResult && currentQuestion < sampleQuestions.length - 1 && (
                  <Button variant="gradient" onClick={nextQuestion}>
                    Next Question
                  </Button>
                )}
                {showResult && currentQuestion === sampleQuestions.length - 1 && (
                  <Button variant="success" onClick={() => setShowDemo(false)}>
                    <Award className="h-4 w-4 mr-2" />
                    Complete Test
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}