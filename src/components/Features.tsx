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
  Clock
} from "lucide-react";

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
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-secondary/10 rounded-full px-4 py-2 mb-4">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium text-secondary">
              Why Choose freequademy
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Features that Make Learning <span className="bg-gradient-secondary bg-clip-text text-transparent">Enjoyable</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Experience education reimagined with gamification, AI-powered insights, and interactive content
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <feature.icon className={`h-12 w-12 ${feature.color} mb-4`} />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card className="inline-flex items-center gap-4 p-6 bg-gradient-card">
            <Clock className="h-8 w-8 text-primary" />
            <div className="text-left">
              <h3 className="font-semibold">Limited Time Offer!</h3>
              <p className="text-sm text-muted-foreground">Get 30 days free trial with full access</p>
            </div>
            <Button variant="gradient">
              Start Free Trial
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}