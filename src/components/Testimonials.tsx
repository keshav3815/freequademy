import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    grade: "Class 12",
    avatar: "PS",
    rating: 5,
    feedback: "Freequademy transformed my approach to learning. The mentorship program helped me score 95% in my board exams. The personalized guidance was exactly what I needed!",
    achievement: "Board Topper - 95%"
  },
  {
    name: "Rahul Verma",
    grade: "Class 10",
    avatar: "RV",
    rating: 5,
    feedback: "The mock tests and practice sessions prepared me thoroughly for my exams. I went from struggling in Math to becoming one of the top performers in my class.",
    achievement: "Math Score: 48 → 92"
  },
  {
    name: "Ananya Patel",
    grade: "Class 11",
    avatar: "AP",
    rating: 5,
    feedback: "Being part of the Science Club and attending live webinars opened up a whole new world of learning. The community here is incredibly supportive!",
    achievement: "Science Olympiad Winner"
  },
  {
    name: "Vikash Kumar",
    grade: "Class 9",
    avatar: "VK",
    rating: 5,
    feedback: "The volunteer mentors are amazing! They explain concepts so clearly. I've gained confidence in subjects I once feared. Truly grateful for this platform.",
    achievement: "Academic Improvement Award"
  }
];

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Success Stories
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Students Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real stories from real students who transformed their academic journey with Freequademy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
                
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.grade}</p>
                  </div>
                </div>

                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  "{testimonial.feedback}"
                </p>

                <div className="pt-4 border-t border-border/50">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                    🏆 {testimonial.achievement}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm">
            Join thousands of students who are already achieving their goals with Freequademy
          </p>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
