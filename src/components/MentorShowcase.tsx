import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Calendar, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Mentor {
  id: string;
  full_name: string;
  expertise: string[] | null;
  rating: number | null;
  bio: string | null;
  total_sessions: number | null;
  is_verified: boolean | null;
  qualification: string | null;
}

const sampleMentors = [
  {
    id: "1",
    full_name: "Dr. Priya Sharma",
    expertise: ["Mathematics", "Physics", "Calculus"],
    rating: 4.9,
    bio: "IIT Delhi alumna with 10+ years of teaching experience",
    total_sessions: 450,
    is_verified: true,
    qualification: "PhD Mathematics",
    availability: "online",
    reviews: 128,
  },
  {
    id: "2",
    full_name: "Rahul Verma",
    expertise: ["Python", "Web Development", "Data Science"],
    rating: 4.8,
    bio: "Software Engineer at Google, passionate about teaching coding",
    total_sessions: 320,
    is_verified: true,
    qualification: "M.Tech Computer Science",
    availability: "online",
    reviews: 95,
  },
  {
    id: "3",
    full_name: "Ananya Gupta",
    expertise: ["Chemistry", "Biology", "NEET Preparation"],
    rating: 4.7,
    bio: "AIIMS doctor helping students crack medical entrance exams",
    total_sessions: 280,
    is_verified: true,
    qualification: "MBBS, AIIMS",
    availability: "busy",
    reviews: 87,
  },
  {
    id: "4",
    full_name: "Vikram Singh",
    expertise: ["English", "Essay Writing", "Communication"],
    rating: 4.9,
    bio: "Published author and language expert with global teaching experience",
    total_sessions: 390,
    is_verified: true,
    qualification: "MA English Literature",
    availability: "offline",
    reviews: 112,
  },
];

const getAvailabilityStatus = (index: number) => {
  const statuses = ["online", "online", "busy", "offline"];
  return statuses[index % statuses.length];
};

const getAvailabilityColor = (status: string) => {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "busy":
      return "bg-yellow-500";
    default:
      return "bg-muted-foreground/50";
  }
};

const getAvailabilityText = (status: string) => {
  switch (status) {
    case "online":
      return "Online";
    case "busy":
      return "Busy";
    default:
      return "Offline";
  }
};

export const MentorShowcase = () => {
  const [mentors, setMentors] = useState<typeof sampleMentors>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        // Use mentors_public view to protect email addresses
        const { data, error } = await supabase
          .from("mentors_public")
          .select("*")
          .eq("is_verified", true)
          .order("rating", { ascending: false })
          .limit(4);

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedMentors = data.map((mentor: Mentor, index: number) => ({
            ...mentor,
            availability: getAvailabilityStatus(index),
            reviews: Math.floor(Math.random() * 100) + 50,
          }));
          setMentors(formattedMentors);
        } else {
          setMentors(sampleMentors);
        }
      } catch (error) {
        console.error("Error fetching mentors:", error);
        setMentors(sampleMentors);
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/30 text-primary">
            <Users className="w-4 h-4 mr-2" />
            Expert Mentors
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Learn from the Best
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Connect with verified mentors who are passionate about helping you succeed
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-40 bg-muted rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mentors.map((mentor) => (
              <Card
                key={mentor.id}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
              >
                <CardContent className="p-6">
                  {/* Avatar with availability indicator */}
                  <div className="relative flex justify-center mb-4">
                    <Avatar className="w-20 h-20 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${mentor.full_name}`}
                        alt={mentor.full_name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {getInitials(mentor.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-1/2 translate-x-8 w-4 h-4 rounded-full border-2 border-card ${getAvailabilityColor(
                        mentor.availability
                      )}`}
                    />
                  </div>

                  {/* Name and Qualification */}
                  <div className="text-center mb-3">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {mentor.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{mentor.qualification}</p>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center justify-center gap-1 mb-3">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{mentor.rating}</span>
                    <span className="text-muted-foreground text-sm">
                      / 5 from {mentor.reviews} reviews
                    </span>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2">
                    {mentor.bio}
                  </p>

                  {/* Expertise Tags */}
                  <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                    {mentor.expertise?.slice(0, 3).map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-0"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  {/* Availability Status */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span
                      className={`text-sm font-medium ${
                        mentor.availability === "online"
                          ? "text-green-500"
                          : mentor.availability === "busy"
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {getAvailabilityText(mentor.availability)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      • {mentor.total_sessions} sessions
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" size="sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Session
                    </Button>
                    {mentor.availability === "online" && (
                      <Button variant="outline" className="w-full" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-10">
          <Button variant="outline" size="lg" className="group">
            View All Mentors
            <Users className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};
