import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Users, Trophy, BookOpen, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export default function Hero() {
  const [userCounts, setUserCounts] = useState({
    total_users: 0,
    student_count: 0,
    mentor_count: 0
  });
  useEffect(() => {
    const fetchUserCounts = async () => {
      const {
        data,
        error
      } = await supabase.rpc('get_user_counts');
      if (!error && data && data.length > 0) {
        setUserCounts(data[0]);
      }
    };
    fetchUserCounts();
  }, []);
  return <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center overflow-hidden py-12 md:py-0">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-gradient-accent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(262_83%_58%/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(24_95%_53%/0.12),transparent_50%)]" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float hidden md:block">
        <div className="w-20 h-20 bg-gradient-primary rounded-full blur-2xl opacity-40" />
      </div>
      <div className="absolute bottom-20 right-10 animate-float animate-delay-200 hidden md:block">
        <div className="w-28 h-28 bg-gradient-secondary rounded-full blur-2xl opacity-40" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="animate-slide-up space-y-6 md:space-y-8">
            

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
              Learn, Practice & 
              <span className="block mt-2 text-gradient-primary text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
                Excel Together
              </span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Gamified learning platform for Classes 6-12 with interactive lessons, 
              mock tests, and live doubt sessions. Make learning fun and effective!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Link to="/courses" className="w-full sm:w-auto">
                <Button variant="gradient" size="lg" className="group w-full shadow-lg hover:shadow-xl">
                  Start Learning Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/demo" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full border-2 hover:bg-primary/5">
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Real User Stats */}
            <div className="glass-card rounded-2xl p-4 md:p-6 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                <span className="text-xs md:text-sm font-medium text-muted-foreground">
                  Live Community Stats
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">
                    {userCounts.total_users.toLocaleString()}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <GraduationCap className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
                  </div>
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-secondary">
                    {userCounts.student_count.toLocaleString()}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">Students</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 md:h-5 md:w-5 text-success fill-success" />
                  </div>
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-success">
                    {userCounts.mentor_count.toLocaleString()}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">Mentors</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-5 animate-fade-in">
            <div className="glass-card rounded-2xl p-4 md:p-6 group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30">
              <div className="p-2 md:p-3 bg-primary/10 rounded-xl w-fit mb-3 md:mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <BookOpen className="h-8 w-8 md:h-10 md:w-10 text-primary group-hover:rotate-6 transition-transform duration-300" />
              </div>
              <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2 group-hover:text-primary transition-colors duration-300">Interactive Lessons</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Animated videos and visual learning
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 md:p-6 group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 hover:border-secondary/30 animate-delay-100">
              <div className="p-2 md:p-3 bg-secondary/10 rounded-xl w-fit mb-3 md:mb-4 group-hover:bg-secondary/20 group-hover:scale-110 transition-all duration-300">
                <Trophy className="h-8 w-8 md:h-10 md:w-10 text-secondary group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2 group-hover:text-secondary transition-colors duration-300">Gamified Learning</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Earn XP, badges, and rewards
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 md:p-6 group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 hover:border-success/30 animate-delay-200">
              <div className="p-2 md:p-3 bg-success/10 rounded-xl w-fit mb-3 md:mb-4 group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300">
                <Users className="h-8 w-8 md:h-10 md:w-10 text-success group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2 group-hover:text-success transition-colors duration-300">Live Sessions</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Real-time doubt clearing
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 md:p-6 group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 animate-delay-300">
              <div className="p-2 md:p-3 bg-primary/10 rounded-xl w-fit mb-3 md:mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <Star className="h-8 w-8 md:h-10 md:w-10 text-primary fill-primary group-hover:rotate-45 transition-transform duration-300" />
              </div>
              <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2 group-hover:text-primary transition-colors duration-300">Performance Track</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Detailed analytics & insights
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>;
}