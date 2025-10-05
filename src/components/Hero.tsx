import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Users, Trophy, BookOpen } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center overflow-hidden py-12 md:py-0">
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
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 shadow-sm">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span className="text-sm font-semibold text-primary">
                Trusted by 50,000+ Students
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight">
              Learn, Practice & 
              <span className="block mt-2 text-gradient-primary">
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

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 pt-4 md:pt-8">
              <div className="text-center">
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">500+</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">Video Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-secondary">10K+</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">Practice Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-success">95%</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-5 animate-fade-in">
            <div className="glass-card rounded-2xl p-4 md:p-6 hover-lift group">
              <div className="p-2 md:p-3 bg-primary/10 rounded-xl w-fit mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                <BookOpen className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">Interactive Lessons</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Animated videos and visual learning
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 md:p-6 hover-lift group animate-delay-100">
              <div className="p-2 md:p-3 bg-secondary/10 rounded-xl w-fit mb-3 md:mb-4 group-hover:bg-secondary/20 transition-colors">
                <Trophy className="h-8 w-8 md:h-10 md:w-10 text-secondary" />
              </div>
              <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">Gamified Learning</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Earn XP, badges, and rewards
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 md:p-6 hover-lift group animate-delay-200">
              <div className="p-2 md:p-3 bg-success/10 rounded-xl w-fit mb-3 md:mb-4 group-hover:bg-success/20 transition-colors">
                <Users className="h-8 w-8 md:h-10 md:w-10 text-success" />
              </div>
              <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">Live Sessions</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Real-time doubt clearing
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 md:p-6 hover-lift group animate-delay-300">
              <div className="p-2 md:p-3 bg-accent/10 rounded-xl w-fit mb-3 md:mb-4 group-hover:bg-accent/20 transition-colors">
                <Star className="h-8 w-8 md:h-10 md:w-10 text-accent fill-accent" />
              </div>
              <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">Performance Track</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Detailed analytics & insights
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}