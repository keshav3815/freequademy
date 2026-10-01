import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Plus, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"community_events"> & { is_registered: boolean };

const EventsSection = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { isMentor, isAdmin } = useAuth();
  const canCreateEvents = isMentor || isAdmin;
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchEvents();
  }, []);

  const checkUser = async () => {
    // Local session (no network round trip); RLS enforces access server-side.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    setUser(user);
  };

  const fetchEvents = async () => {
    // Local session (no network round trip); RLS enforces access server-side.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    
    const { data, error } = await supabase
      .from("community_events")
      .select(`
        *,
        event_registrations!left(user_id)
      `)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at");

    if (error) {
      console.error("Error fetching events:", error);
    } else {
      const eventsWithRegistration = data?.map(event => ({
        ...event,
        is_registered: event.event_registrations?.some((r) => r.user_id === user?.id) || false
      })) || [];
      setEvents(eventsWithRegistration);
    }
  };

  const handleRSVP = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({ title: "Please login to RSVP", variant: "destructive" });
      navigate("/login");
      return;
    }

    const { error } = await supabase
      .from("event_registrations")
      .insert({ event_id: eventId, user_id: user.id });

    if (error) {
      toast({ title: "Error registering for event", variant: "destructive" });
    } else {
      toast({ title: "Successfully registered!" });
      fetchEvents();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Live Events</h2>
          <p className="text-muted-foreground">Join webinars, talks, and study sessions</p>
        </div>
        {canCreateEvents && (
          <Button onClick={() => navigate("/community/create-event")} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming events. Create one!</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card
              key={event.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <Badge>{event.event_type}</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(event.scheduled_at), "PPP")}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {format(new Date(event.scheduled_at), "p")} • {event.duration_minutes} mins
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {event.attendee_count} attendees
                    {event.max_attendees && ` / ${event.max_attendees} max`}
                  </div>
                </div>
                
                {event.is_registered ? (
                  <Button variant="secondary" className="w-full" disabled>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Registered
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={(e) => handleRSVP(event.id, e)}
                    disabled={event.max_attendees !== null && (event.attendee_count ?? 0) >= event.max_attendees}
                  >
                    RSVP
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EventsSection;