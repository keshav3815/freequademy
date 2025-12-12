import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircleQuestion, 
  Sparkles, 
  Upload, 
  Send, 
  User,
  Bot,
  ArrowRight
} from "lucide-react";

interface DoubtSolverProps {
  grade: string;
}

export default function DoubtSolver({ grade }: DoubtSolverProps) {
  const [doubt, setDoubt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const recentDoubts = [
    { question: "How to solve quadratic equations?", status: "answered", subject: "Math" },
    { question: "What is photosynthesis?", status: "pending", subject: "Science" },
  ];

  const handleSubmit = () => {
    if (!doubt.trim()) return;
    setIsLoading(true);
    // Simulate AI response
    setTimeout(() => {
      setIsLoading(false);
      setDoubt("");
    }, 1500);
  };

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Doubt Solver</h3>
          <p className="text-xs text-muted-foreground">Get instant AI answers</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Ask your doubt here... (e.g., How to factorize polynomials?)"
            value={doubt}
            onChange={(e) => setDoubt(e.target.value)}
            className="min-h-[80px] pr-20 resize-none"
          />
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Upload className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              className="h-8 w-8"
              onClick={handleSubmit}
              disabled={!doubt.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Answer
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary/50 transition-colors">
            <User className="h-3 w-3 mr-1" />
            Ask Teacher
          </Badge>
        </div>

        {recentDoubts.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent Doubts</p>
            <div className="space-y-2">
              {recentDoubts.map((d, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {d.status === "answered" ? (
                      <Bot className="h-4 w-4 text-green-500" />
                    ) : (
                      <MessageCircleQuestion className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm truncate max-w-[150px]">{d.question}</span>
                  </div>
                  <Badge variant={d.status === "answered" ? "default" : "secondary"} className="text-xs">
                    {d.subject}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="ghost" className="w-full text-sm" size="sm">
          View All Doubts <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
