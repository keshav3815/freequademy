import { useState, useEffect } from "react";
import { CalendarDays, Star, MessageSquare, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export default function TeacherStats() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch sessions this month
      const { data: sessionsData, count: sessionCount } = await supabase
        .from("mentorship_sessions")
        .select("*", { count: "exact" })
        .eq("mentor_id", user.id)
        .gte("scheduled_at", startOfMonth.toISOString());

      // Fetch feedback for average rating
      const { data: feedbackData } = await supabase
        .from("mentorship_feedback")
        .select("rating")
        .eq("mentor_id", user.id)
        .not("rating", "is", null);

      const avgRating = feedbackData && feedbackData.length > 0
        ? (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackData.length).toFixed(1)
        : "N/A";

      // Fetch pending doubts (forum threads without replies as proxy)
      const { count: pendingDoubtsCount } = await supabase
        .from("forum_threads")
        .select("*", { count: "exact" })
        .eq("reply_count", 0);

      // Fetch total unique students helped
      const { data: participantsData } = await supabase
        .from("session_participants")
        .select("student_id, session_id")
        .in("session_id", (sessionsData || []).map(s => s.id));

      const uniqueStudents = new Set(participantsData?.map(p => p.student_id) || []);

      setStats([
        {
          label: "Sessions This Month",
          value: sessionCount || 0,
          icon: <CalendarDays className="h-5 w-5" />,
          trend: `${sessionsData?.length || 0} scheduled`,
          trendUp: true,
        },
        {
          label: "Avg Rating",
          value: avgRating,
          icon: <Star className="h-5 w-5 text-yellow-500" />,
          trend: feedbackData?.length ? `${feedbackData.length} reviews` : "No reviews yet",
          trendUp: parseFloat(avgRating) >= 4,
        },
        {
          label: "Pending Doubts",
          value: pendingDoubtsCount || 0,
          icon: <MessageSquare className="h-5 w-5 text-orange-500" />,
          trend: "Reply within 2hrs",
          trendUp: false,
        },
        {
          label: "Students Helped",
          value: uniqueStudents.size,
          icon: <Users className="h-5 w-5 text-green-500" />,
          trend: "All time",
          trendUp: true,
        },
      ]);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {stat.icon}
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.trend && (
                <p
                  className={`text-xs mt-1 ${
                    stat.trendUp ? "text-green-500" : "text-muted-foreground"
                  }`}
                >
                  {stat.trend}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
