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
  ArrowRight,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DoubtSolverProps {
  grade: string;
}

interface RecentDoubt {
  question: string;
  answer?: string;
  status: "answered" | "pending";
  subject: string;
}

export default function DoubtSolver({ grade }: DoubtSolverProps) {
  const [doubt, setDoubt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [recentDoubts, setRecentDoubts] = useState<RecentDoubt[]>([]);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!doubt.trim()) return;
    
    setIsLoading(true);
    setCurrentAnswer(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('doubt-solver', {
        body: { 
          question: doubt, 
          grade: grade,
          subject: "General" 
        }
      });

      if (error) {
        throw new Error(error.message || "Failed to get response");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const answer = data?.answer || "Sorry, I couldn't generate a response.";
      setCurrentAnswer(answer);
      
      // Add to recent doubts
      setRecentDoubts(prev => [{
        question: doubt,
        answer: answer,
        status: "answered",
        subject: "General"
      }, ...prev.slice(0, 4)]);
      
      setDoubt("");
    } catch (error: any) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">AI Doubt Solver</h3>
          <p className="text-xs text-muted-foreground">Get instant AI-powered answers</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Ask your doubt here... (e.g., How to factorize polynomials?)"
            value={doubt}
            onChange={(e) => setDoubt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] pr-20 resize-none"
            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
              <Upload className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              className="h-8 w-8"
              onClick={handleSubmit}
              disabled={!doubt.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors bg-primary/5">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Answer
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary/50 transition-colors">
            <User className="h-3 w-3 mr-1" />
            Ask Teacher
          </Badge>
        </div>

        {/* AI Response */}
        {currentAnswer && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI Response</span>
            </div>
            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap">{currentAnswer}</div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        {recentDoubts.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent Doubts</p>
            <div className="space-y-2">
              {recentDoubts.map((d, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (d.answer) {
                      setCurrentAnswer(d.answer);
                    }
                  }}
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
