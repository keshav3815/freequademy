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

const CLUB_CATEGORIES = ["Academic", "Science", "Coding", "Arts", "Debate", "Sports", "Games", "Other"];

export default function CreateClub() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Academic");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("student_clubs")
      .insert({ name: name.trim(), description: description.trim() || null, category, created_by: user.id })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast({ title: "Could not create club", description: "Club names need 3–80 characters.", variant: "destructive" });
      return;
    }
    navigate(`/community/club/${data.id}`, { replace: true });
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
            <CardTitle>Create a student club</CardTitle>
            <CardDescription>Bring together students who share an interest.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Club name</Label>
                <Input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLUB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">What is the club about?</Label>
                <Textarea id="description" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <Button type="submit" disabled={submitting || name.trim().length < 3}>Create club</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
