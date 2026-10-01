import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageCircleQuestion,
  Users,
  MessagesSquare,
  Menu,
  X,
  LogOut,
  Home,
  type LucideIcon,
} from "lucide-react";
import { LEARNING_MODULE_LIST } from "@/lib/learningModules";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import freequademyLogo from "@/assets/freequademy-logo.png";

interface NavItem { name: string; path: string; icon: LucideIcon }

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  { heading: "Main", items: [{ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  {
    heading: "Learning",
    items: LEARNING_MODULE_LIST.map((m) => ({ name: m.title, path: m.basePath, icon: m.icon })),
  },
  {
    heading: "Support",
    items: [
      { name: "My Doubts", path: "/doubts", icon: MessageCircleQuestion },
      { name: "Mentorship", path: "/mentorship", icon: Users },
      { name: "Community", path: "/community", icon: MessagesSquare },
    ],
  },
];

const isActivePath = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/**
 * Persistent left-hand navigation for the signed-in student app shell
 * (StudentLayout). Same responsive pattern as the admin DashboardLayout:
 * fixed sidebar on desktop, slide-over on mobile with a hamburger toggle.
 */
export default function StudentSidebar() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/");
  };

  const displayName = profile?.full_name || "Student";
  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={freequademyLogo} alt="Freequademy logo" className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold">
            <span className="text-foreground">Free</span>
            <span className="text-gradient-primary">quademy</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 flex flex-col transform transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <img
              src={freequademyLogo}
              alt="Freequademy logo"
              className="h-9 w-9 object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-bold">
              <span className="text-foreground">Free</span>
              <span className="text-gradient-primary">quademy</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-5" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading}>
              <p className="px-4 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.heading}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(location.pathname, item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                        isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-t border-border pt-4"
          >
            <Home className="h-5 w-5 shrink-0" />
            <span className="font-medium">Back to site</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div
              className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0"
              aria-hidden="true"
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start gap-3" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
    </>
  );
}
