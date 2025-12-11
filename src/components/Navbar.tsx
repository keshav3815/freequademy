import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import freequademyLogo from "@/assets/freequademy-logo.png";
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
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src={freequademyLogo} 
              alt="freequademy" 
              className="h-10 md:h-12 w-10 md:w-12 rounded-full object-cover border-2 border-primary/20 shadow-sm"
            />
            <span className="text-lg md:text-xl font-bold text-gradient-primary">
              freequademy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <Link
              to="/courses"
              className={`font-medium px-3 py-2 rounded-lg transition-all ${
                isActive("/courses") 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              }`}
            >
              Courses
            </Link>
            <Link
              to="/tests"
              className={`font-medium px-3 py-2 rounded-lg transition-all ${
                isActive("/tests") 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              }`}
            >
              Mock Tests
            </Link>
            <Link
              to="/mentorship"
              className={`font-medium px-3 py-2 rounded-lg transition-all ${
                isActive("/mentorship") 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              }`}
            >
              Mentorship
            </Link>
            <Link
              to="/community"
              className={`font-medium px-3 py-2 rounded-lg transition-all ${
                isActive("/community") 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              }`}
            >
              Community
            </Link>
            {user && (
              <Link
                to={getDashboardPath()}
                className={`font-medium px-3 py-2 rounded-lg transition-all ${
                  isActive(getDashboardPath()) 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                }`}
              >
                Dashboard
              </Link>
            )}
            <Link
              to="/pricing"
              className={`font-medium px-3 py-2 rounded-lg transition-all ${
                isActive("/pricing") 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/donations"
              className={`font-medium px-3 py-2 rounded-lg transition-all ${
                isActive("/donations") 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              }`}
            >
              Donate
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-2 hover:border-primary/50">
                    {userRole === 'mentor' ? (
                      <GraduationCap className="h-4 w-4 mr-2" />
                    ) : (
                      <User className="h-4 w-4 mr-2" />
                    )}
                    <span className="max-w-32 truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardPath()} className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      {userRole === 'mentor' ? 'Teacher Dashboard' : 'Student Dashboard'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="border-2 hover:border-primary/50">
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="gradient" size="sm" className="shadow-lg hover:shadow-xl">
                      Get Started
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
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
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
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
          <div className="lg:hidden py-4 animate-slide-up border-t border-border/50 bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col gap-2">
              <Link
                to="/courses"
                className={`font-medium px-4 py-3 rounded-lg transition-all ${
                  isActive("/courses") 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Courses
              </Link>
              <Link
                to="/tests"
                className={`font-medium px-4 py-3 rounded-lg transition-all ${
                  isActive("/tests") 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Mock Tests
              </Link>
              <Link
                to="/mentorship"
                className={`font-medium px-4 py-3 rounded-lg transition-all ${
                  isActive("/mentorship") 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Mentorship
              </Link>
              <Link
                to="/community"
                className={`font-medium px-4 py-3 rounded-lg transition-all ${
                  isActive("/community") 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Community
              </Link>
              {user && (
                <Link
                  to={getDashboardPath()}
                  className={`font-medium px-4 py-3 rounded-lg transition-all ${
                    isActive(getDashboardPath()) 
                      ? "text-primary bg-primary/10" 
                      : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              <Link
                to="/pricing"
                className={`font-medium px-4 py-3 rounded-lg transition-all ${
                  isActive("/pricing") 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/donations"
                className={`font-medium px-4 py-3 rounded-lg transition-all ${
                  isActive("/donations") 
                    ? "text-primary bg-primary/10" 
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Donate
              </Link>
              <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-border/50">
                {user ? (
                  <>
                    <div className="px-4 py-3 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                      {user.email}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full border-2 hover:border-destructive/50 hover:text-destructive" 
                      size="sm" 
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="w-full">
                      <Button variant="outline" className="w-full border-2 hover:border-primary/50" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                    </Link>
                    <Link to="/signup-student" className="w-full">
                      <Button variant="gradient" className="w-full shadow-lg" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        Sign up as Student
                      </Button>
                    </Link>
                    <Link to="/signup-mentor" className="w-full">
                      <Button variant="secondary" className="w-full shadow-md" size="sm">
                        <GraduationCap className="h-4 w-4 mr-2" />
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