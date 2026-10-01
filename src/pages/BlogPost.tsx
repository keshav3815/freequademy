import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Lightbulb, HelpCircle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface PracticeQuestion {
  question: string;
  type: "mcq" | "short";
  options?: string[];
}

interface BlogPostData {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  chapter: string;
  introduction: string;
  concept_explanation: string;
  real_life_example: string;
  quick_tips: string[];
  practice_questions: PracticeQuestion[];
  summary_points: string[];
  motivational_line: string;
  author_name: string;
  created_at: string;
}

const BlogPost = () => {
  const { postId } = useParams();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", postId ?? "")
        .eq("status", "published")
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        practice_questions: data.practice_questions as unknown as PracticeQuestion[],
      } as BlogPostData;
    },
    enabled: !!postId,
  });

  useDocumentMeta({
    title: post?.title ?? "Blog",
    description: post ? `${post.introduction.slice(0, 155)}` : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Blog post nahi mila</h1>
          <p className="text-muted-foreground mb-6">Ye post available nahi hai ya delete ho gaya hai.</p>
          <Link to="/blog">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/blog">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>

        <article>
          <header className="mb-8">
            <div className="flex gap-2 mb-4">
              <Badge variant="secondary">{post.class_level}</Badge>
              <Badge variant="outline">{post.subject}</Badge>
              <Badge variant="outline">{post.chapter}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {post.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              By {post.author_name}
            </p>
          </header>

          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Introduction
              </h2>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                {post.introduction}
              </p>
            </section>

            {/* Concept Explanation */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                Concept Explanation
              </h2>
              <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
                <p className="text-foreground/90 whitespace-pre-line">
                  {post.concept_explanation}
                </p>
              </div>
            </section>

            {/* Real-Life Example */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Real-Life Example</h2>
              <Card className="bg-accent/20 border-accent">
                <CardContent className="pt-6">
                  <p className="text-foreground/90 whitespace-pre-line">
                    {post.real_life_example}
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Quick Tips */}
            {post.quick_tips && post.quick_tips.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Quick Tips for Exam</h2>
                <Card className="bg-primary/10 border-primary">
                  <CardContent className="pt-6">
                    <ul className="space-y-3">
                      {post.quick_tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Practice Questions */}
            {post.practice_questions && post.practice_questions.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <HelpCircle className="h-6 w-6 text-primary" />
                  Practice Questions
                </h2>
                <div className="space-y-4">
                  {post.practice_questions.map((q, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <p className="font-medium mb-2">
                          Q{index + 1}. {q.question} {q.type === "mcq" ? "(MCQ)" : "(Short Answer)"}
                        </p>
                        {q.type === "mcq" && q.options && (
                          <div className="space-y-1">
                            {q.options.filter(o => o).map((opt, i) => (
                              <p key={i} className="text-muted-foreground text-sm">
                                {String.fromCharCode(97 + i)}) {opt}
                              </p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Summary */}
            {post.summary_points && post.summary_points.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Summary / Key Points</h2>
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <ul className="space-y-2">
                      {post.summary_points.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary font-bold">{index + 1}.</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Motivational Line */}
            <section className="mb-8">
              <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary">
                <CardContent className="pt-6 text-center">
                  <p className="text-lg font-medium text-foreground">
                    {post.motivational_line}
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
