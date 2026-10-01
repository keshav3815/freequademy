import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"forum_categories">;

type Thread = Pick<Tables<"forum_threads">, "id" | "title" | "content" | "upvotes" | "reply_count" | "created_at" | "author_id" | "is_pinned"> & {
  author: { full_name: string };
};

const ForumSection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    fetchThreads();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("forum_categories")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error loading categories", variant: "destructive" });
    } else {
      setCategories(data || []);
    }
  };

  const fetchThreads = async () => {
    let query = supabase
      .from("forum_threads")
      .select("id, title, content, upvotes, reply_count, created_at, author_id, is_pinned")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }

    const { data: threadsData, error } = await query;

    if (error) {
      console.error("Error fetching threads:", error);
      return;
    }

    // One batched lookup for author display names (public_profiles view).
    const authorIds = [...new Set((threadsData || []).map((t) => t.author_id))];
    const { data: authors } = authorIds.length
      ? await supabase.from("public_profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const nameById = new Map((authors || []).map((a) => [a.id, a.full_name]));

    const threadsWithAuthors = (threadsData || []).map((thread) => ({
      ...thread,
      author: { full_name: nameById.get(thread.author_id) || "Student" },
    }));

    setThreads(threadsWithAuthors);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Discussion Forums</h2>
          <p className="text-muted-foreground">Ask questions and share knowledge</p>
        </div>
        <Button onClick={() => navigate("/community/new-thread")} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          onClick={() => setSelectedCategory(null)}
          className="w-full"
        >
          All Topics
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(category.id)}
            className="w-full"
          >
            {category.name}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {threads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No threads yet. Start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          threads.map((thread) => (
            <Link key={thread.id} to={`/community/thread/${thread.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <CardTitle className="text-lg">{thread.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {thread.upvotes}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {thread.reply_count}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  By {thread.author?.full_name || "Anonymous"} • {thread.created_at && new Date(thread.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{thread.content}</p>
              </CardContent>
            </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default ForumSection;