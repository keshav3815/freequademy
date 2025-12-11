import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Medal, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface LeaderboardProps {
  grade: string;
  userName: string;
}

const getLeaderboardData = (grade: string) => {
  // Mock data - in real app, this would come from database
  return {
    daily: [
      { rank: 1, name: "Priya Sharma", xp: 450, change: "up" },
      { rank: 2, name: "Rahul Kumar", xp: 420, change: "up" },
      { rank: 3, name: "Ananya Singh", xp: 380, change: "down" },
      { rank: 4, name: "Arjun Patel", xp: 350, change: "same" },
      { rank: 5, name: "Neha Gupta", xp: 320, change: "up" },
    ],
    weekly: [
      { rank: 1, name: "Rahul Kumar", xp: 2800, change: "up" },
      { rank: 2, name: "Priya Sharma", xp: 2650, change: "down" },
      { rank: 3, name: "Vikram Reddy", xp: 2400, change: "up" },
      { rank: 4, name: "Ananya Singh", xp: 2200, change: "same" },
      { rank: 5, name: "Arjun Patel", xp: 2100, change: "down" },
    ],
    monthly: [
      { rank: 1, name: "Vikram Reddy", xp: 12500, change: "up" },
      { rank: 2, name: "Priya Sharma", xp: 11800, change: "same" },
      { rank: 3, name: "Rahul Kumar", xp: 11200, change: "down" },
      { rank: 4, name: "Meera Nair", xp: 10500, change: "up" },
      { rank: 5, name: "Ananya Singh", xp: 9800, change: "up" },
    ],
  };
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getChangeIcon = (change: string) => {
  switch (change) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function Leaderboard({ grade, userName }: LeaderboardProps) {
  const data = getLeaderboardData(grade);
  const userRank = 15; // Mock user rank

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leaderboard
        </h2>
        <Badge variant="outline">Class {grade}</Badge>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        {Object.entries(data).map(([period, leaders]) => (
          <TabsContent key={period} value={period} className="space-y-2">
            {leaders.map((leader, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  index === 0
                    ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30"
                    : index === 1
                    ? "bg-gradient-to-r from-gray-400/10 to-gray-300/10 border border-gray-400/30"
                    : index === 2
                    ? "bg-gradient-to-r from-amber-600/10 to-orange-500/10 border border-amber-600/30"
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">{getRankIcon(leader.rank)}</div>
                  <span className="font-medium">{leader.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary">{leader.xp.toLocaleString()} XP</span>
                  {getChangeIcon(leader.change)}
                </div>
              </div>
            ))}

            {/* User's position */}
            <div className="mt-4 p-3 bg-primary/5 border-2 border-primary/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">#{userRank}</span>
                  <span className="font-medium">You ({userName})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">2,850 XP</span>
                  <Badge variant="secondary">Top 15%</Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
