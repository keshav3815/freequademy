import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  subject: string;
  class_level: string;
  chapter: string;
  introduction: string;
  read_time_minutes: number;
}

const Blog = () => {
  const { isMentor } = useAuth();
  useDocumentMeta({ title: "Study Notes", description: "Free chapter notes and study guides written by Freequademy mentors, for Classes 6–12." });

  const { data: blogPosts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, subject, class_level, chapter, introduction, read_time_minutes")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);
      
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-12">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Freequademy Blog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              NCERT-aligned study content in simple Hinglish. Padho, samjho, aur exam mein best karo!
            </p>
          </div>
          {isMentor && (
            <Link to="/blog/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-full">
                <CardHeader>
                  <div className="flex gap-2 mb-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-6 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full mb-3" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : blogPosts && blogPosts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
                  <CardHeader>
                    <div className="flex gap-2 mb-2">
                      <Badge variant="secondary">{post.class_level}</Badge>
                      <Badge variant="outline">{post.subject}</Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {post.introduction}
                    </p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{post.chapter}</span>
                      <span>{post.read_time_minutes} min read</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Koi blog post abhi available nahi hai. Jaldi aayega!
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
