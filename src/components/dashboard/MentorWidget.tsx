import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Calendar, 
  Video, 
  Star,
  Clock,
  ArrowRight,
  MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MentorWidget() {
  const navigate = useNavigate();

  const upcomingSessions = [
    {
      mentor: "Dr. Priya Sharma",
      subject: "Mathematics",
      time: "Today, 5:00 PM",
      avatar: "",
      rating: 4.9,
    },
  ];

  const availableMentors = [
    { name: "Rajesh Kumar", subject: "Physics", status: "online", rating: 4.8 },
    { name: "Anita Desai", subject: "Chemistry", status: "online", rating: 4.7 },
  ];

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Users className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold">Mentorship</h3>
            <p className="text-xs text-muted-foreground">1-on-1 guidance</p>
          </div>
        </div>
      </div>

      {upcomingSessions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Upcoming Session</p>
          {upcomingSessions.map((session, i) => (
            <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={session.avatar} />
                  <AvatarFallback>{session.mentor.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{session.mentor}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{session.subject}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      {session.rating}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {session.time}
                </div>
                <Button size="sm" className="h-7 text-xs">
                  <Video className="h-3 w-3 mr-1" />
                  Join
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Available Mentors</p>
        <div className="space-y-2">
          {availableMentors.map((mentor, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{mentor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div>
                  <p className="text-sm font-medium">{mentor.name}</p>
                  <p className="text-xs text-muted-foreground">{mentor.subject}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1 text-sm" 
          size="sm"
          onClick={() => navigate("/mentorship")}
        >
          <Calendar className="h-4 w-4 mr-1" />
          Book Session
        </Button>
        <Button 
          variant="ghost" 
          className="flex-1 text-sm" 
          size="sm"
          onClick={() => navigate("/mentorship")}
        >
          View All <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
