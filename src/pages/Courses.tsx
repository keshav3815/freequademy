import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Book, Clock, Star, Lock, PlayCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Grade-specific subjects
const getSubjectsByGrade = (grade: string) => {
  const baseSubjects = [
    { id: 1, name: "Mathematics", color: "from-blue-400 to-blue-600", free: true },
    { id: 2, name: "Science", color: "from-green-400 to-green-600", free: true },
    { id: 3, name: "English", color: "from-purple-400 to-purple-600", free: false },
    { id: 4, name: "Social Studies", color: "from-orange-400 to-orange-600", free: false },
    { id: 5, name: "Hindi", color: "from-pink-400 to-pink-600", free: false },
  ];

  const gradeConfig: Record<string, any> = {
    "6": baseSubjects.map(s => ({ ...s, chapters: 10 + Math.floor(Math.random() * 5), duration: `${20 + Math.floor(Math.random() * 10)} hrs`, rating: 4.3 + Math.random() * 0.5 })),
    "7": baseSubjects.map(s => ({ ...s, chapters: 11 + Math.floor(Math.random() * 5), duration: `${22 + Math.floor(Math.random() * 10)} hrs`, rating: 4.4 + Math.random() * 0.5 })),
    "8": baseSubjects.map(s => ({ ...s, chapters: 12 + Math.floor(Math.random() * 5), duration: `${25 + Math.floor(Math.random() * 10)} hrs`, rating: 4.4 + Math.random() * 0.5 })),
    "9": baseSubjects.map(s => ({ ...s, chapters: 13 + Math.floor(Math.random() * 5), duration: `${28 + Math.floor(Math.random() * 10)} hrs`, rating: 4.5 + Math.random() * 0.5 })),
    "10": baseSubjects.map(s => ({ ...s, chapters: 15 + Math.floor(Math.random() * 5), duration: `${35 + Math.floor(Math.random() * 10)} hrs`, rating: 4.6 + Math.random() * 0.5 })),
  };

  // For class 11 and 12, show stream-specific subjects
  const scienceStream = [
    { id: 1, name: "Mathematics", chapters: 18, duration: "45 hrs", rating: 4.7, color: "from-blue-400 to-blue-600", free: true },
    { id: 2, name: "Physics", chapters: 16, duration: "40 hrs", rating: 4.6, color: "from-indigo-400 to-indigo-600", free: true },
    { id: 3, name: "Chemistry", chapters: 15, duration: "38 hrs", rating: 4.5, color: "from-green-400 to-green-600", free: false },
    { id: 4, name: "Biology", chapters: 14, duration: "36 hrs", rating: 4.6, color: "from-emerald-400 to-emerald-600", free: false },
    { id: 5, name: "English", chapters: 10, duration: "25 hrs", rating: 4.4, color: "from-purple-400 to-purple-600", free: false },
    { id: 6, name: "Computer Science", chapters: 12, duration: "30 hrs", rating: 4.8, color: "from-cyan-400 to-cyan-600", free: true },
  ];

  const commerceStream = [
    { id: 1, name: "Accountancy", chapters: 16, duration: "40 hrs", rating: 4.6, color: "from-blue-400 to-blue-600", free: true },
    { id: 2, name: "Business Studies", chapters: 14, duration: "35 hrs", rating: 4.5, color: "from-green-400 to-green-600", free: true },
    { id: 3, name: "Economics", chapters: 12, duration: "30 hrs", rating: 4.4, color: "from-purple-400 to-purple-600", free: false },
    { id: 4, name: "Mathematics", chapters: 15, duration: "38 hrs", rating: 4.7, color: "from-orange-400 to-orange-600", free: false },
    { id: 5, name: "English", chapters: 10, duration: "25 hrs", rating: 4.4, color: "from-pink-400 to-pink-600", free: false },
  ];

  if (grade === "11" || grade === "12") {
    return scienceStream; // Default to science stream, can be made selectable
  }

  return gradeConfig[grade] || gradeConfig["10"];
};

export default function Courses() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const classParam = searchParams.get("class");
  const [selectedClass, setSelectedClass] = useState(classParam || "10");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!error && profile) {
          setUserProfile(profile);
          if (profile.role === 'student' && profile.grade) {
            setSelectedClass(profile.grade);
            setIsStudent(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subjects = getSubjectsByGrade(selectedClass);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                {isStudent ? `Your registered class curriculum` : `Choose your subject and start learning with interactive content`}
              </p>
            </div>
            
            {!isStudent ? (
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
            ) : (
              <Badge variant="secondary" className="px-4 py-2">
                Registered: Class {selectedClass}
              </Badge>
            )}
          </div>

          {isStudent && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are viewing courses for Class {selectedClass} based on your registration. 
                Contact support if you need to change your registered class.
              </AlertDescription>
            </Alert>
          )}

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