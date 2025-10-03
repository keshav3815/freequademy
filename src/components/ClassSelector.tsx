import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

const classes = [
  { grade: 6, color: "from-purple-400 to-purple-600" },
  { grade: 7, color: "from-blue-400 to-blue-600" },
  { grade: 8, color: "from-green-400 to-green-600" },
  { grade: 9, color: "from-yellow-400 to-yellow-600" },
  { grade: 10, color: "from-orange-400 to-orange-600" },
  { grade: 11, color: "from-red-400 to-red-600" },
  { grade: 12, color: "from-pink-400 to-pink-600" },
];

export default function ClassSelector() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your <span className="bg-gradient-primary bg-clip-text text-transparent">Class</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Select your grade to access tailored content and curriculum
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {classes.map((cls, index) => (
            <Link
              key={cls.grade}
              to={`/courses?class=${cls.grade}`}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card className="relative overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer group">
                <div className={`absolute inset-0 bg-gradient-to-br ${cls.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="p-6 text-center relative">
                  <GraduationCap className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <div className="text-2xl font-bold mb-1">Class {cls.grade}</div>
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