import { useEffect, useState } from "react";
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

export default function NewThread() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("forum_categories").select("id, name").order("name").then(({ data }) => setCategories(data || []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("forum_threads")
      .insert({
        author_id: user.id,
        category_id: categoryId || null,
        title: title.trim(),
        content: content.trim(),
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast({ title: "Could not post your question", description: "Please check the title and details.", variant: "destructive" });
      return;
    }
    navigate(`/community/thread/${data.id}`, { replace: true });
  };

  const valid = title.trim().length >= 3 && content.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/community" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to community
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Start a discussion</CardTitle>
            <CardDescription>Ask a question or share something useful with other students.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Topic</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Choose a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Details</Label>
                <Textarea id="content" value={content} maxLength={10000} rows={8} onChange={(e) => setContent(e.target.value)} required />
              </div>
              <p className="text-xs text-muted-foreground">
                Be kind and don't share personal details such as your phone number or address.
              </p>
              <Button type="submit" disabled={!valid || submitting}>Post</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
