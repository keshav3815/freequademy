import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Gift, Clock, Trophy, Star } from "lucide-react";
import { useState } from "react";

interface DailyChallengeProps {
  grade: string;
}

const getChallengeByGrade = (grade: string) => {
  const challenges: Record<string, {
    title: string;
    subject: string;
    questions: number;
    timeLimit: string;
    xpReward: number;
    difficulty: string;
  }> = {
    "6": {
      title: "Fraction Frenzy",
      subject: "Mathematics",
      questions: 5,
      timeLimit: "5 mins",
      xpReward: 50,
      difficulty: "Easy",
    },
    "7": {
      title: "Algebra Adventure",
      subject: "Mathematics",
      questions: 5,
      timeLimit: "6 mins",
      xpReward: 60,
      difficulty: "Easy",
    },
    "8": {
      title: "Equation Explorer",
      subject: "Mathematics",
      questions: 5,
      timeLimit: "7 mins",
      xpReward: 70,
      difficulty: "Medium",
    },
    "9": {
      title: "Polynomial Puzzle",
      subject: "Mathematics",
      questions: 5,
      timeLimit: "8 mins",
      xpReward: 80,
      difficulty: "Medium",
    },
    "10": {
      title: "Quadratic Quest",
      subject: "Mathematics",
      questions: 5,
      timeLimit: "8 mins",
      xpReward: 100,
      difficulty: "Medium",
    },
    "11": {
      title: "Trigonometry Trial",
      subject: "Mathematics",
      questions: 5,
      timeLimit: "10 mins",
      xpReward: 120,
      difficulty: "Hard",
    },
    "12": {
      title: "Calculus Challenge",
      subject: "Mathematics",
      questions: 5,
      timeLimit: "10 mins",
      xpReward: 150,
      difficulty: "Hard",
    },
  };
  return challenges[grade] || challenges["10"];
};

export default function DailyChallenge({ grade }: DailyChallengeProps) {
  const challenge = getChallengeByGrade(grade);
  const [isStarted, setIsStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const difficultyColors: Record<string, string> = {
    Easy: "bg-green-500/10 text-green-500 border-green-500/30",
    Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    Hard: "bg-red-500/10 text-red-500 border-red-500/30",
  };

  return (
    <Card className="p-6 animate-fade-in overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Challenge of the Day
          </h2>
          <Badge variant="outline" className="animate-pulse">
            <Clock className="h-3 w-3 mr-1" />
            Resets in 8h
          </Badge>
        </div>

        {!completed ? (
          <>
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{challenge.title}</h3>
                <Badge className={difficultyColors[challenge.difficulty]}>
                  {challenge.difficulty}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{challenge.subject}</p>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-background/50 rounded-lg">
                  <div className="text-lg font-bold">{challenge.questions}</div>
                  <div className="text-xs text-muted-foreground">Questions</div>
                </div>
                <div className="p-2 bg-background/50 rounded-lg">
                  <div className="text-lg font-bold">{challenge.timeLimit}</div>
                  <div className="text-xs text-muted-foreground">Time</div>
                </div>
                <div className="p-2 bg-background/50 rounded-lg">
                  <div className="text-lg font-bold text-primary">+{challenge.xpReward}</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Gift className="h-5 w-5 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Today's Reward</p>
                <p className="text-xs text-muted-foreground">Complete to earn XP and a mystery badge!</p>
              </div>
            </div>

            <Button 
              variant="gradient" 
              className="w-full"
              onClick={() => setIsStarted(true)}
            >
              {isStarted ? "Continue Challenge" : "Start Challenge"}
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold mb-2">Challenge Completed!</h3>
            <p className="text-muted-foreground mb-4">You earned {challenge.xpReward} XP</p>
            <div className="flex items-center justify-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
