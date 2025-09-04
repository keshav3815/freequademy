import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Target,
  Flame,
  Star,
  Award,
  TrendingUp,
  Clock,
  BookOpen,
  Zap,
  Medal,
  Crown,
  Shield
} from "lucide-react";

const badges = [
  { icon: Flame, name: "7 Day Streak", earned: true, color: "text-orange-500" },
  { icon: Star, name: "First Perfect Score", earned: true, color: "text-yellow-500" },
  { icon: Trophy, name: "Top Performer", earned: false, color: "text-primary" },
  { icon: Crown, name: "Quiz Master", earned: false, color: "text-purple-500" },
  { icon: Shield, name: "Consistency Hero", earned: true, color: "text-blue-500" },
  { icon: Medal, name: "100 Questions", earned: true, color: "text-green-500" },
];

const recentActivity = [
  { subject: "Mathematics", chapter: "Quadratic Equations", score: 85, time: "2 hours ago" },
  { subject: "Science", chapter: "Chemical Reactions", score: 92, time: "Yesterday" },
  { subject: "English", chapter: "Grammar Basics", score: 78, time: "2 days ago" },
];

export default function Dashboard() {
  const [level] = useState(12);
  const [xp] = useState(2850);
  const [nextLevelXp] = useState(3000);
  const [streak] = useState(7);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 animate-slide-up">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, <span className="bg-gradient-primary bg-clip-text text-transparent">Student!</span>
            </h1>
            <p className="text-muted-foreground">
              Track your progress and achievements
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <Zap className="h-8 w-8 text-primary" />
                <Badge variant="secondary">{streak} days</Badge>
              </div>
              <h3 className="font-semibold text-lg">Current Streak</h3>
              <p className="text-sm text-muted-foreground">Keep it going!</p>
            </Card>

            <Card className="p-6 animate-scale-in" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center justify-between mb-4">
                <Target className="h-8 w-8 text-secondary" />
                <span className="text-2xl font-bold">87%</span>
              </div>
              <h3 className="font-semibold text-lg">Avg. Score</h3>
              <p className="text-sm text-muted-foreground">+5% from last week</p>
            </Card>

            <Card className="p-6 animate-scale-in" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-8 w-8 text-success" />
                <span className="text-2xl font-bold">24h</span>
              </div>
              <h3 className="font-semibold text-lg">Time Spent</h3>
              <p className="text-sm text-muted-foreground">This week</p>
            </Card>

            <Card className="p-6 animate-scale-in" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center justify-between mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">156</span>
              </div>
              <h3 className="font-semibold text-lg">Lessons Done</h3>
              <p className="text-sm text-muted-foreground">12 this week</p>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Level Progress */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Level {level}</h2>
                    <p className="text-sm text-muted-foreground">
                      {xp}/{nextLevelXp} XP to Level {level + 1}
                    </p>
                  </div>
                  <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {Math.floor((xp / nextLevelXp) * 100)}%
                  </div>
                </div>
                <Progress value={(xp / nextLevelXp) * 100} className="h-3" />
                <div className="flex justify-between mt-4">
                  <Badge variant="outline">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Top 15% in your class
                  </Badge>
                  <Button variant="gradient" size="sm">
                    View Leaderboard
                  </Button>
                </div>
              </Card>

              {/* Recent Activity */}
              <Card className="p-6 animate-fade-in">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div>
                        <h3 className="font-medium">{activity.subject}</h3>
                        <p className="text-sm text-muted-foreground">{activity.chapter}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {activity.score}%
                        </div>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Achievements */}
            <Card className="p-6 animate-fade-in">
              <h2 className="text-xl font-semibold mb-4">Achievements</h2>
              <div className="grid grid-cols-2 gap-4">
                {badges.map((badge, index) => (
                  <div
                    key={index}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                      badge.earned
                        ? "border-primary bg-primary/5 hover:scale-105"
                        : "border-border bg-muted/20 opacity-50"
                    }`}
                  >
                    <badge.icon className={`h-8 w-8 mb-2 ${badge.earned ? badge.color : "text-muted-foreground"}`} />
                    <span className="text-xs text-center font-medium">
                      {badge.name}
                    </span>
                    {badge.earned && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Earned
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Achievements
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}