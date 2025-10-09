import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { FileText, Activity, AlertTriangle, Users } from "lucide-react";

const AdminDashboard = () => {
  const { role } = useUserRole();
  const [stats, setStats] = useState({
    totalContent: 0,
    pendingContent: 0,
    totalReports: 0,
    pendingReports: 0,
    recentActivity: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [contentRes, reportsRes, activityRes] = await Promise.all([
          supabase.from("dashboard_content").select("*", { count: "exact" }),
          supabase.from("user_reports").select("*", { count: "exact" }),
          supabase.from("user_activity_log").select("*", { count: "exact" }),
        ]);

        const pendingContent = await supabase
          .from("dashboard_content")
          .select("*", { count: "exact" })
          .eq("status", "pending");

        const pendingReports = await supabase
          .from("user_reports")
          .select("*", { count: "exact" })
          .eq("status", "pending");

        setStats({
          totalContent: contentRes.count || 0,
          pendingContent: pendingContent.count || 0,
          totalReports: reportsRes.count || 0,
          pendingReports: pendingReports.count || 0,
          recentActivity: activityRes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome to Admin Dashboard
        </h1>
        <p className="text-muted-foreground capitalize">
          You are logged in as {role}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingContent} pending review
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingReports} pending action
            </p>
          </CardContent>
        </Card>

        {role === "admin" && (
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentActivity}</div>
              <p className="text-xs text-muted-foreground">Total logged actions</p>
            </CardContent>
          </Card>
        )}

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{role}</div>
            <p className="text-xs text-muted-foreground">Access level</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <h3 className="font-semibold mb-1">Review Content</h3>
              <p className="text-sm text-muted-foreground">
                Check pending submissions from users
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <h3 className="font-semibold mb-1">Handle Reports</h3>
              <p className="text-sm text-muted-foreground">
                Review and action user reports
              </p>
            </div>
            {role === "admin" && (
              <div className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                <h3 className="font-semibold mb-1">Monitor Activity</h3>
                <p className="text-sm text-muted-foreground">
                  Track user actions in real-time
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
