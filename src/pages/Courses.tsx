import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Book, Clock, Star, Lock, PlayCircle } from "lucide-react";

const subjects = [
  { id: 1, name: "Mathematics", chapters: 15, duration: "40 hrs", rating: 4.8, color: "from-blue-400 to-blue-600", free: true },
  { id: 2, name: "Science", chapters: 12, duration: "35 hrs", rating: 4.7, color: "from-green-400 to-green-600", free: true },
  { id: 3, name: "English", chapters: 10, duration: "25 hrs", rating: 4.6, color: "from-purple-400 to-purple-600", free: false },
  { id: 4, name: "Social Studies", chapters: 14, duration: "30 hrs", rating: 4.5, color: "from-orange-400 to-orange-600", free: false },
  { id: 5, name: "Hindi", chapters: 8, duration: "20 hrs", rating: 4.4, color: "from-pink-400 to-pink-600", free: false },
  { id: 6, name: "Computer Science", chapters: 11, duration: "28 hrs", rating: 4.9, color: "from-indigo-400 to-indigo-600", free: true },
];

export default function Courses() {
  const [searchParams] = useSearchParams();
  const classParam = searchParams.get("class");
  const [selectedClass, setSelectedClass] = useState(classParam || "10");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="animate-slide-up">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Class <span className="bg-gradient-primary bg-clip-text text-transparent">{selectedClass}</span> Courses
              </h1>
              <p className="text-muted-foreground">
                Choose your subject and start learning with interactive content
              </p>
            </div>
            
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {[6, 7, 8, 9, 10, 11, 12].map((cls) => (
                  <SelectItem key={cls} value={cls.toString()}>
                    Class {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject, index) => (
              <Card 
                key={subject.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`h-32 bg-gradient-to-br ${subject.color} relative`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-2xl font-bold">{subject.name}</h3>
                  </div>
                  {subject.free && (
                    <Badge className="absolute top-4 right-4 bg-success text-success-foreground">
                      Free Demo
                    </Badge>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Book className="h-4 w-4" />
                      {subject.chapters} Chapters
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {subject.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      {subject.rating}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Video Lessons</span>
                      <span className="font-semibold">{subject.chapters * 3}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Practice Tests</span>
                      <span className="font-semibold">{subject.chapters * 5}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Assignments</span>
                      <span className="font-semibold">{subject.chapters * 2}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant={subject.free ? "gradient" : "outline"} 
                    className="w-full"
                  >
                    {subject.free ? (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Learning
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Unlock Course
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}