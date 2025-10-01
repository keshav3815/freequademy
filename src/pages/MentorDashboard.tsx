import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Clock, Calendar as CalendarIcon, Star, 
  Video, MessageSquare, Award, TrendingUp, 
  CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MentorStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  averageRating: number;
  totalStudents: number;
}

interface Session {
  id: string;
  title: string;
  description: string;
  session_type: 'one-on-one' | 'group';
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  participants: any[];
}

interface Feedback {
  id: string;
  rating: number;
  feedback_text: string;
  created_at: string;
  session: {
    title: string;
  };
  student: {
    full_name: string;
  };
}

export default function MentorDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MentorStats>({
    totalSessions: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    averageRating: 0,
    totalStudents: 0,
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    session_type: "one-on-one",
    scheduled_at: "",
    duration_minutes: "60",
    max_participants: "1",
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch mentor profile
      const { data: mentorProfile } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', user.id)
        .single();

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('mentorship_sessions')
        .select(`
          *,
          participants:session_participants(*)
        `)
        .eq('mentor_id', user.id)
        .order('scheduled_at', { ascending: false });

      if (sessionsData) {
        setSessions(sessionsData as Session[]);
        
        // Calculate stats
        const completed = sessionsData.filter(s => s.status === 'completed').length;
        const upcoming = sessionsData.filter(s => s.status === 'scheduled').length;
        
        setStats({
          totalSessions: sessionsData.length,
          completedSessions: completed,
          upcomingSessions: upcoming,
          averageRating: mentorProfile?.rating || 0,
          totalStudents: mentorProfile?.total_sessions || 0,
        });
      }

      // Fetch feedbacks
      const { data: feedbackData } = await supabase
        .from('mentorship_feedback')
        .select(`
          *,
          session:mentorship_sessions(title),
          student:profiles(full_name)
        `)
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (feedbackData) {
        setFeedbacks(feedbackData as any);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('mentorship_sessions')
        .insert({
          mentor_id: user.id,
          title: newSession.title,
          description: newSession.description,
          session_type: newSession.session_type as 'one-on-one' | 'group',
          scheduled_at: newSession.scheduled_at,
          duration_minutes: parseInt(newSession.duration_minutes),
          max_participants: parseInt(newSession.max_participants),
          status: 'scheduled'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session created successfully",
      });

      setShowCreateSession(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
    }
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('mentorship_sessions')
        .update({ status })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Session ${status}`,
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "Failed to update session",
        variant: "destructive",
      });
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const todaysSessions = sessions.filter(s => {
    const sessionDate = new Date(s.scheduled_at).toDateString();
    return sessionDate === new Date().toDateString() && s.status === 'scheduled';
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Mentor Dashboard</h1>
          <p className="text-muted-foreground">Manage your mentorship sessions and track your impact</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Your Sessions</h2>
              <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
                <DialogTrigger asChild>
                  <Button>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Create Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="title">Session Title</Label>
                      <Input
                        id="title"
                        value={newSession.title}
                        onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newSession.description}
                        onChange={(e) => setNewSession({...newSession, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Session Type</Label>
                      <Select
                        value={newSession.session_type}
                        onValueChange={(value) => setNewSession({...newSession, session_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-on-one">One-on-One</SelectItem>
                          <SelectItem value="group">Group</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="scheduled_at">Date & Time</Label>
                      <Input
                        id="scheduled_at"
                        type="datetime-local"
                        value={newSession.scheduled_at}
                        onChange={(e) => setNewSession({...newSession, scheduled_at: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newSession.duration_minutes}
                        onChange={(e) => setNewSession({...newSession, duration_minutes: e.target.value})}
                      />
                    </div>
                    {newSession.session_type === 'group' && (
                      <div>
                        <Label htmlFor="max_participants">Max Participants</Label>
                        <Input
                          id="max_participants"
                          type="number"
                          value={newSession.max_participants}
                          onChange={(e) => setNewSession({...newSession, max_participants: e.target.value})}
                        />
                      </div>
                    )}
                    <Button onClick={handleCreateSession} className="w-full">
                      Create Session
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {todaysSessions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Today's Sessions</h3>
                  <div className="space-y-3">
                    {todaysSessions.map((session) => (
                      <Card key={session.id} className="border-primary/20">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{session.title}</CardTitle>
                              <CardDescription>
                                {new Date(session.scheduled_at).toLocaleTimeString()}
                              </CardDescription>
                            </div>
                            <Badge variant="default">Today</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateSessionStatus(session.id, 'ongoing')}
                            >
                              <Video className="mr-2 h-4 w-4" />
                              Start Session
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateSessionStatus(session.id, 'completed')}
                            >
                              Mark Complete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-3">Upcoming Sessions</h3>
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{session.title}</CardTitle>
                            <CardDescription>
                              {new Date(session.scheduled_at).toLocaleDateString()} at {new Date(session.scheduled_at).toLocaleTimeString()}
                            </CardDescription>
                          </div>
                          <Badge variant={session.session_type === 'one-on-one' ? 'default' : 'secondary'}>
                            {session.session_type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{session.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4" />
                            {session.duration_minutes} min
                          </div>
                          <div className="flex items-center">
                            <Users className="mr-1 h-4 w-4" />
                            {session.participants?.length || 0} registered
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sessions on {selectedDate?.toLocaleDateString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions
                    .filter(s => new Date(s.scheduled_at).toDateString() === selectedDate?.toDateString())
                    .map((session) => (
                      <div key={session.id} className="mb-4 p-3 border rounded-lg">
                        <div className="font-medium">{session.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(session.scheduled_at).toLocaleTimeString()}
                        </div>
                        <Badge variant="outline" className="mt-2">
                          {session.status}
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback</CardTitle>
                <CardDescription>See what your students are saying</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.id} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{feedback.session?.title}</p>
                          <p className="text-sm text-muted-foreground">
                            by {feedback.student?.full_name || 'Anonymous'}
                          </p>
                        </div>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < feedback.rating
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm">{feedback.feedback_text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(feedback.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
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