import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  LayoutDashboard, 
  FileText, 
  Activity, 
  AlertTriangle, 
  UserCheck,
  BookOpen,
  HeartPulse,
  Menu, 
  X, 
  LogOut 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { role, loading, isAdmin } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/");
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
      roles: ["admin", "moderator"],
    },
    {
      name: "Content Management",
      path: "/admin/content",
      icon: FileText,
      roles: ["admin", "moderator"],
    },
    {
      name: "User Activity",
      path: "/admin/activity",
      icon: Activity,
      roles: ["admin"],
    },
    {
      name: "Curriculum",
      path: "/admin/curriculum",
      icon: BookOpen,
      roles: ["admin"],
    },
    {
      name: "Mentor Applications",
      path: "/admin/applications",
      icon: UserCheck,
      roles: ["admin"],
    },
    {
      name: "System Health",
      path: "/admin/system",
      icon: HeartPulse,
      roles: ["admin"],
    },
    {
      name: "Report Management",
      path: "/admin/reports",
      icon: AlertTriangle,
      roles: ["admin", "moderator"],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(role || "")
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this dashboard.</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-gradient-primary">
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{role} Access</p>
        </div>

        <nav className="p-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover-lift ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
