import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, Star, Award, BookOpen, Target, MessageSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MentorshipProgram {
  id: string;
  title: string;
  description: string;
  type: 'one-on-one' | 'group';
  category: 'academic' | 'skill-based';
  max_participants: number;
  duration_weeks: number;
}

interface MentorProfile {
  id: string;
  full_name: string;
  bio: string;
  expertise: string[];
  qualification: string;
  experience_years: number;
  is_volunteer: boolean;
  is_verified: boolean;
  rating: number;
  total_sessions: number;
}

interface Session {
  id: string;
  title: string;
  description: string;
  session_type: 'one-on-one' | 'group';
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  max_participants: number;
  mentor: MentorProfile;
  participants_count?: number;
}

export default function Mentorship() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<MentorshipProgram[]>([]);
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'academic' | 'skill-based'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch mentorship programs
      const { data: programsData, error: programsError } = await supabase
        .from('mentorship_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (programsError) throw programsError;
      setPrograms((programsData || []) as MentorshipProgram[]);

      // Fetch verified mentors (using public view to protect emails)
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('mentors_public')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false });

      if (mentorsError) throw mentorsError;
      setMentors((mentorsData || []) as MentorProfile[]);

      // Fetch upcoming sessions with mentor details (using public view)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('mentorship_sessions')
        .select(`
          *,
          mentor:mentors_public(*)
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(6);

      if (sessionsError) throw sessionsError;
      setSessions((sessionsData || []) as Session[]);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load mentorship data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSessionRegistration = async (sessionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register for sessions",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    try {
      const { error } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          student_id: user.id,
          status: 'registered'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully registered for the session",
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Error",
        description: "Failed to register for session",
        variant: "destructive",
      });
    }
  };

  const filteredPrograms = selectedCategory === 'all' 
    ? programs 
    : programs.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Mentorship Programs</h1>
          <p className="text-muted-foreground text-lg">
            Connect with experienced mentors for personalized guidance and support
          </p>
        </div>

        <Tabs defaultValue="programs" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="mentors">Our Mentors</TabsTrigger>
            <TabsTrigger value="sessions">Upcoming Sessions</TabsTrigger>
            <TabsTrigger value="apply">Become a Mentor</TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="space-y-6">
            <div className="flex gap-4 mb-6">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
              >
                All Programs
              </Button>
              <Button
                variant={selectedCategory === 'academic' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('academic')}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Academic
              </Button>
              <Button
                variant={selectedCategory === 'skill-based' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('skill-based')}
              >
                <Target className="mr-2 h-4 w-4" />
                Skill-Based
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPrograms.map((program) => (
                <Card key={program.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={program.type === 'one-on-one' ? 'default' : 'secondary'}>
                        {program.type === 'one-on-one' ? (
                          <Users className="mr-1 h-3 w-3" />
                        ) : (
                          <Users className="mr-1 h-3 w-3" />
                        )}
                        {program.type}
                      </Badge>
                      <Badge variant="outline">
                        {program.category}
                      </Badge>
                    </div>
                    <CardTitle>{program.title}</CardTitle>
                    <CardDescription>{program.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {program.duration_weeks} weeks
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        Max {program.max_participants} participants
                      </div>
                    </div>
                    <Button className="w-full">View Details</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mentors" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mentors.map((mentor) => (
                <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{mentor.full_name}</CardTitle>
                        <CardDescription>{mentor.qualification}</CardDescription>
                      </div>
                      {mentor.is_verified && (
                        <Badge variant="default">
                          <Award className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{mentor.bio}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <Star className="mr-2 h-4 w-4 text-yellow-500" />
                        {mentor.rating.toFixed(1)} ({mentor.total_sessions} sessions)
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4" />
                        {mentor.experience_years} years experience
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {mentor.expertise?.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    {mentor.is_volunteer && (
                      <Badge variant="outline" className="mb-4">
                        Volunteer Mentor
                      </Badge>
                    )}

                    <Button className="w-full">View Profile</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={session.session_type === 'one-on-one' ? 'default' : 'secondary'}>
                        {session.session_type}
                      </Badge>
                      <Badge variant="outline">
                        {session.status}
                      </Badge>
                    </div>
                    <CardTitle>{session.title}</CardTitle>
                    <CardDescription>
                      with {session.mentor?.full_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {session.description}
                    </p>
                    
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        {new Date(session.scheduled_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {new Date(session.scheduled_at).toLocaleTimeString()} ({session.duration_minutes} min)
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        Max {session.max_participants} participants
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => handleSessionRegistration(session.id)}
                    >
                      Register for Session
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="apply">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Become a Mentor</CardTitle>
                <CardDescription>
                  Share your knowledge and experience with students. Join our community of mentors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Volunteer Mentor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start">
                            <MessageSquare className="mr-2 h-4 w-4 mt-0.5 text-primary" />
                            Give back to the community
                          </li>
                          <li className="flex items-start">
                            <Calendar className="mr-2 h-4 w-4 mt-0.5 text-primary" />
                            Flexible scheduling
                          </li>
                          <li className="flex items-start">
                            <Award className="mr-2 h-4 w-4 mt-0.5 text-primary" />
                            Certificate of appreciation
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Professional Mentor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start">
                            <Target className="mr-2 h-4 w-4 mt-0.5 text-primary" />
                            Paid opportunities
                          </li>
                          <li className="flex items-start">
                            <Users className="mr-2 h-4 w-4 mt-0.5 text-primary" />
                            Build your reputation
                          </li>
                          <li className="flex items-start">
                            <Star className="mr-2 h-4 w-4 mt-0.5 text-primary" />
                            Professional development
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-center">
                    <Button 
                      size="lg" 
                      onClick={() => navigate('/mentor-application')}
                    >
                      Apply to Become a Mentor
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}