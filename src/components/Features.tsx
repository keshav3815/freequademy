import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Target, 
  Zap, 
  Users, 
  BarChart, 
  Shield,
  Sparkles,
  Clock,
  Gamepad2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Learning",
    description: "Personalized learning paths adapted to each student's pace and style",
    color: "text-primary"
  },
  {
    icon: Target,
    title: "Topic-wise Practice",
    description: "Thousands of questions organized by topic with detailed solutions",
    color: "text-secondary"
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    description: "Get immediate results and explanations for every answer",
    color: "text-success"
  },
  {
    icon: Users,
    title: "Live Classes",
    description: "Interactive sessions with expert teachers for doubt clearing",
    color: "text-primary"
  },
  {
    icon: BarChart,
    title: "Progress Analytics",
    description: "Detailed performance tracking and improvement insights",
    color: "text-secondary"
  },
  {
    icon: Shield,
    title: "Certified Content",
    description: "Curriculum aligned with CBSE, ICSE, and state boards",
    color: "text-success"
  }
];

export default function Features() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-2 mb-6 shadow-sm">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-secondary">
              Why Choose freequademy
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6">
            Features that Make Learning{" "}
            <span className="text-gradient-secondary">Enjoyable</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
            Experience education reimagined with gamification, AI-powered insights, and interactive content
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group glass-card hover-lift p-6 md:p-8 animate-scale-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`p-3 md:p-4 rounded-xl w-fit mb-4 md:mb-6 group-hover:scale-110 transition-transform ${
                feature.color === 'text-primary' ? 'bg-primary/10' :
                feature.color === 'text-secondary' ? 'bg-secondary/10' :
                'bg-success/10'
              }`}>
                <feature.icon className={`h-10 w-10 md:h-12 md:w-12 ${feature.color}`} />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">{feature.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>

        {/* Gamified Learning Section */}
        <div className="mt-16 md:mt-20">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-4 shadow-sm">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Gamified Learning
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-3">
              Learn Through <span className="text-gradient-primary">Interactive Games</span>
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Make learning fun with educational games designed to reinforce concepts
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Card className="glass-card hover-lift p-6 group cursor-pointer" onClick={() => navigate('/game/guess-number')}>
              <div className="p-4 bg-primary/10 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <Gamepad2 className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">Guess the Number</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                Test your logical thinking and number sense in this fun guessing game
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Play Now
              </Button>
            </Card>
          </div>
        </div>

        <div className="mt-12 md:mt-16 flex justify-center">
          <Card className="glass-card flex flex-col sm:flex-row items-center gap-4 md:gap-6 p-6 md:p-8 w-full max-w-3xl hover-lift">
            <div className="p-3 md:p-4 bg-primary/10 rounded-xl">
              <Clock className="h-8 w-8 md:h-10 md:w-10 text-primary flex-shrink-0" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Limited Time Offer!</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Get 30 days free trial with full access to all premium features
              </p>
            </div>
            <Button variant="gradient" size="lg" className="w-full sm:w-auto shadow-lg hover:shadow-xl">
              Start Free Trial
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}