import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Flame,
  Star,
  Award,
  TrendingUp,
  Zap,
  Medal,
  Crown,
  Shield,
  Loader2,
  Calendar,
  Target,
  Clock,
  BookOpen
} from "lucide-react";

// Dashboard Components
import ContinueLearningWidget from "@/components/dashboard/ContinueLearningWidget";
import QuickAccessShortcuts from "@/components/dashboard/QuickAccessShortcuts";
import SubjectProgress from "@/components/dashboard/SubjectProgress";
import RevisionPlanner from "@/components/dashboard/RevisionPlanner";
import DoubtSolver from "@/components/dashboard/DoubtSolver";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";

const badges = [
  { icon: Flame, name: "7 Day Streak", earned: true, color: "text-orange-500" },
  { icon: Star, name: "First Perfect Score", earned: true, color: "text-yellow-500" },
  { icon: Trophy, name: "Top Performer", earned: false, color: "text-primary" },
  { icon: Crown, name: "Quiz Master", earned: false, color: "text-purple-500" },
  { icon: Shield, name: "Consistency Hero", earned: true, color: "text-blue-500" },
  { icon: Medal, name: "100 Questions", earned: true, color: "text-green-500" },
];

// Grade-specific recent activity
const getRecentActivityByGrade = (grade: string) => {
  const gradeActivities: Record<string, typeof recentActivity> = {
    "6": [
      { subject: "Mathematics", chapter: "Fractions and Decimals", score: 85, time: "2 hours ago" },
      { subject: "Science", chapter: "Food and Nutrition", score: 92, time: "Yesterday" },
      { subject: "English", chapter: "Nouns and Pronouns", score: 78, time: "2 days ago" },
    ],
    "7": [
      { subject: "Mathematics", chapter: "Algebraic Expressions", score: 85, time: "2 hours ago" },
      { subject: "Science", chapter: "Heat and Temperature", score: 92, time: "Yesterday" },
      { subject: "English", chapter: "Tenses", score: 78, time: "2 days ago" },
    ],
    "8": [
      { subject: "Mathematics", chapter: "Linear Equations", score: 85, time: "2 hours ago" },
      { subject: "Science", chapter: "Force and Pressure", score: 92, time: "Yesterday" },
      { subject: "English", chapter: "Active and Passive Voice", score: 78, time: "2 days ago" },
    ],
    "9": [
      { subject: "Mathematics", chapter: "Polynomials", score: 85, time: "2 hours ago" },
      { subject: "Science", chapter: "Atoms and Molecules", score: 92, time: "Yesterday" },
      { subject: "English", chapter: "Direct and Indirect Speech", score: 78, time: "2 days ago" },
    ],
    "10": [
      { subject: "Mathematics", chapter: "Quadratic Equations", score: 85, time: "2 hours ago" },
      { subject: "Science", chapter: "Chemical Reactions", score: 92, time: "Yesterday" },
      { subject: "English", chapter: "Grammar Basics", score: 78, time: "2 days ago" },
    ],
    "11": [
      { subject: "Mathematics", chapter: "Trigonometry", score: 85, time: "2 hours ago" },
      { subject: "Physics", chapter: "Motion in a Plane", score: 92, time: "Yesterday" },
      { subject: "Chemistry", chapter: "Chemical Bonding", score: 78, time: "2 days ago" },
    ],
    "12": [
      { subject: "Mathematics", chapter: "Calculus", score: 85, time: "2 hours ago" },
      { subject: "Physics", chapter: "Electromagnetic Waves", score: 92, time: "Yesterday" },
      { subject: "Chemistry", chapter: "Organic Chemistry", score: 78, time: "2 days ago" },
    ],
  };
  return gradeActivities[grade] || gradeActivities["10"];
};

const recentActivity = [
  { subject: "Mathematics", chapter: "Quadratic Equations", score: 85, time: "2 hours ago" },
  { subject: "Science", chapter: "Chemical Reactions", score: 92, time: "Yesterday" },
  { subject: "English", chapter: "Grammar Basics", score: 78, time: "2 days ago" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [level] = useState(12);
  const [xp] = useState(2850);
  const [nextLevelXp] = useState(3000);
  const [streak] = useState(7);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentGrade = userProfile?.grade || "10";
  const userName = userProfile?.full_name || "Student";
  const currentActivities = getRecentActivityByGrade(currentGrade);
  
  // Get current date info
  const today = new Date();
  const dayProgress = Math.round((today.getHours() / 24) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-6 md:py-10">
        <div className="container mx-auto px-4">
          
          {/* ========== TOP SECTION ========== */}
          {/* Welcome + XP/Level/Streak + Progress Bar */}
          <div className="mb-8">
            {/* Welcome Header with Quick Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4 animate-slide-up">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  Welcome back, <span className="bg-gradient-primary bg-clip-text text-transparent">{userName}!</span>
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  Class {currentGrade} Dashboard
                </p>
              </div>
              
              {/* XP, Level, Streak Badges */}
              <div className="flex flex-wrap gap-3 animate-fade-in">
                <Card className="px-4 py-2 flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-primary/10">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="font-bold">{level}</p>
                  </div>
                </Card>
                <Card className="px-4 py-2 flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-yellow-500/10">
                    <Zap className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">XP</p>
                    <p className="font-bold">{xp}/{nextLevelXp}</p>
                  </div>
                </Card>
                <Card className="px-4 py-2 flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-orange-500/10">
                    <Flame className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Streak</p>
                    <p className="font-bold">{streak} days</p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Today's Learning Progress Bar */}
            <Card className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Today's Learning Progress</span>
                <span className="text-sm text-primary font-semibold">65%</span>
              </div>
              <Progress value={65} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-2">3 lessons & 2 quizzes completed. Keep it up!</p>
            </Card>
          </div>

          {/* Quick Access Shortcuts */}
          <div className="mb-8">
            <QuickAccessShortcuts />
          </div>

          {/* ========== MIDDLE SECTION ========== */}
          {/* Continue Learning + Subjects Overview + Upcoming Schedule */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Continue Learning */}
            <ContinueLearningWidget grade={currentGrade} />
            
            {/* Subject Progress Overview */}
            <SubjectProgress grade={currentGrade} />
            
            {/* Upcoming Tests/Classes */}
            <UpcomingSchedule grade={currentGrade} />
          </div>

          {/* ========== BOTTOM SECTION ========== */}
          {/* Doubt Solver + Revision Planner */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Doubt Solver */}
            <DoubtSolver grade={currentGrade} />
            
            {/* Revision Planner */}
            <RevisionPlanner grade={currentGrade} />
          </div>

          {/* Achievements Section */}
          <Card className="p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Achievements
              </h2>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
              {badges.map((badge, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center p-3 md:p-4 rounded-lg border-2 transition-all ${
                    badge.earned
                      ? "border-primary bg-primary/5 hover:scale-105"
                      : "border-border bg-muted/20 opacity-50"
                  }`}
                >
                  <badge.icon className={`h-6 md:h-8 w-6 md:w-8 mb-2 ${badge.earned ? badge.color : "text-muted-foreground"}`} />
                  <span className="text-xs text-center font-medium line-clamp-2">
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
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
