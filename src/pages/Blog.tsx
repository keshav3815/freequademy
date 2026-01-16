import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const blogPosts = [
  {
    id: "newton-laws-motion",
    title: "Newton's Laws of Motion - Samjho Asaan Tarike Se",
    subject: "Science",
    class: "Class 9",
    chapter: "Force and Laws of Motion",
    excerpt: "Newton ke teen laws ko samjho bilkul simple examples ke saath...",
    readTime: "5 min read",
  },
  {
    id: "photosynthesis",
    title: "Photosynthesis - Plants Khana Kaise Banate Hain?",
    subject: "Biology",
    class: "Class 10",
    chapter: "Life Processes",
    excerpt: "Jaano plants apna food kaise prepare karte hain sunlight se...",
    readTime: "4 min read",
  },
  {
    id: "quadratic-equations",
    title: "Quadratic Equations - Step by Step Solution",
    subject: "Maths",
    class: "Class 10",
    chapter: "Quadratic Equations",
    excerpt: "Quadratic equations solve karna seekho aasan steps mein...",
    readTime: "6 min read",
  },
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Freequademy Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            NCERT-aligned study content in simple Hinglish. Padho, samjho, aur exam mein best karo!
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Link key={post.id} to={`/blog/${post.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
                <CardHeader>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="secondary">{post.class}</Badge>
                    <Badge variant="outline">{post.subject}</Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-3">
                    {post.excerpt}
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{post.chapter}</span>
                    <span>{post.readTime}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
