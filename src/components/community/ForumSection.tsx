import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Thread {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  reply_count: number;
  created_at: string;
  author: {
    full_name: string;
  };
}

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
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }

    const { data: threadsData, error } = await query;

    if (error) {
      console.error("Error fetching threads:", error);
      return;
    }

    // Fetch author names separately
    const threadsWithAuthors = await Promise.all(
      (threadsData || []).map(async (thread) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", thread.author_id)
          .single();
        
        return {
          ...thread,
          author: {
            full_name: profile?.full_name || "Anonymous"
          }
        };
      })
    );

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
            <Card
              key={thread.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/community/thread/${thread.id}`)}
            >
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
                  By {thread.author?.full_name || "Anonymous"} • {new Date(thread.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{thread.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ForumSection;