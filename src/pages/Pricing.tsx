import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Get started with basic features",
    icon: Star,
    color: "text-muted-foreground",
    features: [
      "Access to demo videos",
      "5 practice tests per month",
      "Basic progress tracking",
      "Community forum access",
      "Limited study materials",
    ],
    notIncluded: [
      "Live doubt sessions",
      "Full course access",
      "Performance analytics",
      "Priority support",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: "₹49",
    period: "per month",
    description: "Most popular for serious learners",
    icon: Zap,
    color: "text-primary",
    features: [
      "All Free features",
      "Unlimited video lessons",
      "Unlimited practice tests",
      "Live doubt sessions (5/month)",
      "Detailed performance analytics",
      "Download study materials",
      "Priority email support",
      "Ad-free experience",
    ],
    notIncluded: [
      "1-on-1 mentoring",
      "Custom study plans",
    ],
    popular: true,
  },
  {
    name: "Pro",
    price: "₹199",
    period: "per year",
    description: "Best value for dedicated students",
    icon: Crown,
    color: "text-secondary",
    features: [
      "All Premium features",
      "Unlimited live sessions",
      "1-on-1 mentoring (2 hrs/month)",
      "Custom study plans",
      "Early access to new content",
      "Offline downloads",
      "24/7 priority support",
      "Parent progress reports",
      "Certificate of completion",
    ],
    notIncluded: [],
    popular: false,
    savings: "Save ₹389",
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-slide-up">
            <Badge variant="secondary" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              Limited Time Offer
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Choose Your <span className="bg-gradient-primary bg-clip-text text-transparent">Learning Plan</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Unlock premium features and accelerate your learning journey with our affordable plans
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={plan.name}
                className={`relative p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-scale-in ${
                  plan.popular ? "border-primary shadow-glow" : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                
                {plan.savings && (
                  <Badge className="absolute -top-3 right-4 bg-success text-success-foreground">
                    {plan.savings}
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <plan.icon className={`h-12 w-12 mx-auto mb-4 ${plan.color}`} />
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3 opacity-50">
                      <span className="h-5 w-5 mt-0.5 flex-shrink-0 text-center text-muted-foreground">×</span>
                      <span className="text-sm line-through">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  variant={plan.popular ? "gradient" : "outline"} 
                  className="w-full"
                  size="lg"
                >
                  {plan.name === "Free" ? "Start Free" : "Get Started"}
                </Button>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Card className="inline-block p-6 bg-gradient-card">
              <h3 className="text-lg font-semibold mb-2">
                🎉 Special Offer for New Students
              </h3>
              <p className="text-muted-foreground mb-4">
                Get 30 days free trial on Premium plan. No credit card required!
              </p>
              <Button variant="gradient">
                Start Free Trial
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}