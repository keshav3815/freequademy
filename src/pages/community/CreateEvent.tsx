import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPES = ["Workshop", "Study group", "Webinar", "Q&A", "Competition"];

/** Mentors and admins only (enforced by RLS; the route is guarded too). */
export default function CreateEvent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "Workshop",
    scheduled_at: "",
    duration_minutes: "60",
    max_attendees: "",
    meeting_link: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const link = form.meeting_link.trim();
    if (link && !/^https:\/\/\S+$/i.test(link)) {
      toast({ title: "Meeting links must start with https://", variant: "destructive" });
      return;
    }
    if (!form.scheduled_at || new Date(form.scheduled_at) <= new Date()) {
      toast({ title: "Choose a future date and time", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("community_events").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_type: form.event_type,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Math.max(15, parseInt(form.duration_minutes) || 60),
      max_attendees: form.max_attendees ? Math.max(1, parseInt(form.max_attendees)) : null,
      meeting_link: link || null,
      created_by: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not create event", variant: "destructive" });
      return;
    }
    toast({ title: "Event published" });
    navigate("/community", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/community" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to community
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Create a live event</CardTitle>
            <CardDescription>Events are visible to all students.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} maxLength={150} onChange={(e) => set("title")(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={form.event_type} onValueChange={set("event_type")}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="when">Date & time</Label>
                  <Input id="when" type="datetime-local" value={form.scheduled_at} onChange={(e) => set("scheduled_at")(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input id="duration" type="number" min={15} value={form.duration_minutes} onChange={(e) => set("duration_minutes")(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Maximum attendees (optional)</Label>
                <Input id="max" type="number" min={1} value={form.max_attendees} onChange={(e) => set("max_attendees")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link">Meeting link (https)</Label>
                <Input id="link" type="url" placeholder="https://" value={form.meeting_link} onChange={(e) => set("meeting_link")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} maxLength={2000} onChange={(e) => set("description")(e.target.value)} />
              </div>
              <Button type="submit" disabled={submitting || form.title.trim().length < 3}>Publish event</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
