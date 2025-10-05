import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

const classes = [
  { grade: 6, bgClass: "bg-primary/10 hover:bg-primary/20", borderClass: "border-primary/30" },
  { grade: 7, bgClass: "bg-secondary/10 hover:bg-secondary/20", borderClass: "border-secondary/30" },
  { grade: 8, bgClass: "bg-success/10 hover:bg-success/20", borderClass: "border-success/30" },
  { grade: 9, bgClass: "bg-accent/10 hover:bg-accent/20", borderClass: "border-accent/30" },
  { grade: 10, bgClass: "bg-primary/10 hover:bg-primary/20", borderClass: "border-primary/30" },
  { grade: 11, bgClass: "bg-secondary/10 hover:bg-secondary/20", borderClass: "border-secondary/30" },
  { grade: 12, bgClass: "bg-success/10 hover:bg-success/20", borderClass: "border-success/30" },
];

export default function ClassSelector() {
  return (
    <section className="py-16 md:py-24 bg-gradient-accent">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16 animate-slide-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6">
            Choose Your <span className="text-gradient-primary">Class</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg lg:text-xl max-w-2xl mx-auto">
            Select your grade to access tailored content and curriculum
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
          {classes.map((cls, index) => (
            <Link
              key={cls.grade}
              to={`/courses?class=${cls.grade}`}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card className={`group relative overflow-hidden hover-lift cursor-pointer border-2 ${cls.borderClass} transition-all`}>
                <div className={`absolute inset-0 ${cls.bgClass} transition-all`} />
                <div className="p-4 md:p-6 text-center relative">
                  <div className="p-2 md:p-3 bg-background/80 rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold mb-1">Class {cls.grade}</div>
                  <div className="text-xs text-muted-foreground">CBSE/ICSE</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}