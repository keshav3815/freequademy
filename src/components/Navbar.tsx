import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, BookOpen, LogOut, User, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'mentor' | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role if logged in
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setUserRole(profile?.role as 'student' | 'mentor' | null);
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setUserRole(profile?.role as 'student' | 'mentor' | null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/");
    }
    
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const getDashboardPath = () => {
    return userRole === 'mentor' ? '/teacher-dashboard' : '/dashboard';
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              freequademy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/courses"
              className={`font-medium transition-colors ${
                isActive("/courses") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Courses
            </Link>
            <Link
              to="/tests"
              className={`font-medium transition-colors ${
                isActive("/tests") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Mock Tests
            </Link>
            {user && (
              <Link
                to={getDashboardPath()}
                className={`font-medium transition-colors ${
                  isActive(getDashboardPath()) ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                Dashboard
              </Link>
            )}
            <Link
              to="/pricing"
              className={`font-medium transition-colors ${
                isActive("/pricing") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Pricing
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {userRole === 'mentor' ? (
                      <GraduationCap className="h-4 w-4 mr-2" />
                    ) : (
                      <User className="h-4 w-4 mr-2" />
                    )}
                    {user.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardPath()} className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      {userRole === 'mentor' ? 'Teacher Dashboard' : 'Student Dashboard'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-1" />
                    Login
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="gradient" size="sm">
                      Get Started
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/signup-student" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        Sign up as Student
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/signup-mentor" className="cursor-pointer">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Sign up as Mentor
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 animate-slide-up">
            <div className="flex flex-col gap-3">
              <Link
                to="/courses"
                className="font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Courses
              </Link>
              <Link
                to="/tests"
                className="font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Mock Tests
              </Link>
              {user && (
                <Link
                  to={getDashboardPath()}
                  className="font-medium text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              <Link
                to="/pricing"
                className="font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                {user ? (
                  <>
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm" 
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="outline" className="w-full" size="sm">
                        Login
                      </Button>
                    </Link>
                    <Link to="/signup-student">
                      <Button variant="gradient" className="w-full" size="sm">
                        Sign up as Student
                      </Button>
                    </Link>
                    <Link to="/signup-mentor">
                      <Button variant="secondary" className="w-full" size="sm">
                        Sign up as Mentor
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}