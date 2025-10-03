import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Users, Trophy, BookOpen } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <div className="w-16 h-16 bg-gradient-primary rounded-full blur-xl opacity-30" />
      </div>
      <div className="absolute bottom-20 right-10 animate-float animation-delay-2000">
        <div className="w-24 h-24 bg-gradient-secondary rounded-full blur-xl opacity-30" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Trusted by 50,000+ Students
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Learn, Practice & 
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Excel</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Gamified learning platform for Classes 6-12 with interactive lessons, 
              mock tests, and live doubt sessions. Make learning fun and effective!
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Link to="/courses">
                <Button variant="gradient" size="lg" className="group">
                  Start Learning Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg">
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center sm:text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Video Lessons</div>
              </div>
              <div className="text-center sm:text-center">
                <div className="text-2xl md:text-3xl font-bold text-secondary">10K+</div>
                <div className="text-sm text-muted-foreground">Practice Questions</div>
              </div>
              <div className="text-center sm:text-center">
                <div className="text-2xl md:text-3xl font-bold text-success">95%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105">
              <BookOpen className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Interactive Lessons</h3>
              <p className="text-sm text-muted-foreground">
                Animated videos and visual learning
              </p>
            </div>
            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105">
              <Trophy className="h-10 w-10 text-secondary mb-3" />
              <h3 className="font-semibold mb-2">Gamified Learning</h3>
              <p className="text-sm text-muted-foreground">
                Earn XP, badges, and rewards
              </p>
            </div>
            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105">
              <Users className="h-10 w-10 text-success mb-3" />
              <h3 className="font-semibold mb-2">Live Sessions</h3>
              <p className="text-sm text-muted-foreground">
                Real-time doubt clearing
              </p>
            </div>
            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105">
              <Star className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Performance Track</h3>
              <p className="text-sm text-muted-foreground">
                Detailed analytics & insights
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}