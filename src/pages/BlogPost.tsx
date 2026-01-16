import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Lightbulb, HelpCircle, CheckCircle } from "lucide-react";

const blogContent: Record<string, {
  title: string;
  subject: string;
  class: string;
  chapter: string;
  content: React.ReactNode;
}> = {
  "newton-laws-motion": {
    title: "Newton's Laws of Motion - Samjho Asaan Tarike Se",
    subject: "Science",
    class: "Class 9",
    chapter: "Force and Laws of Motion",
    content: (
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Introduction
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Newton ke Laws of Motion physics ka ek bahut important topic hai. Ye laws humein batate hain ki cheezein kyun move karti hain aur kyun ruk jaati hain.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            Agar aap ye teen laws samajh gaye, toh bahut saare questions aasani se solve ho jayenge. Chalo step by step samjhte hain.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Concept Explanation
          </h2>
          
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
              <h3 className="font-bold text-lg text-foreground mb-2">First Law (Law of Inertia)</h3>
              <p className="text-foreground/90">
                Agar koi cheez ruki hui hai, toh woh ruki rahegi. Agar chal rahi hai, toh chalti rahegi. Jab tak koi force na lage.
              </p>
              <p className="text-foreground/90 mt-2">
                Simple words mein: Cheezein apni state change nahi karti jab tak unhe force se na badla jaye.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
              <h3 className="font-bold text-lg text-foreground mb-2">Second Law (F = ma)</h3>
              <p className="text-foreground/90">
                Force = Mass x Acceleration. Matlab jitna zyada force lagaoge, utni zyada speed se cheez move karegi.
              </p>
              <p className="text-foreground/90 mt-2">
                Agar cheez bhaari hai, toh usse move karne ke liye zyada force chahiye.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
              <h3 className="font-bold text-lg text-foreground mb-2">Third Law (Action-Reaction)</h3>
              <p className="text-foreground/90">
                Har action ki ek equal aur opposite reaction hoti hai. Agar aap wall ko push karte ho, wall bhi aapko utna hi push karti hai.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Real-Life Example</h2>
          <Card className="bg-accent/20 border-accent">
            <CardContent className="pt-6">
              <p className="text-foreground/90 mb-3">
                <strong>Bus Example:</strong> Jab bus suddenly brake lagati hai, aap aage ki taraf jhuk jaate ho. Kyun? Kyunki aapka body motion mein tha aur woh motion mein rehna chahta tha. Yahi First Law hai.
              </p>
              <p className="text-foreground/90 mb-3">
                <strong>Cricket Ball:</strong> Jab aap cricket ball ko zyada force se maarte ho, woh zyada door jaati hai. Yahi Second Law hai.
              </p>
              <p className="text-foreground/90">
                <strong>Swimming:</strong> Jab aap paani ko peeche push karte ho, paani aapko aage push karta hai. Yahi Third Law hai.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Quick Tips for Exam</h2>
          <Card className="bg-primary/10 border-primary">
            <CardContent className="pt-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>First Law ko Inertia ka Law bhi kehte hain. Ye yaad rakho.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>F = ma formula bahut important hai. Units yaad rakho: F (Newton), m (kg), a (m/s2).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Third Law mein action aur reaction dono SAME magnitude ke hote hain but OPPOSITE direction mein.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Diagrams banao jab bhi possible ho. Examiner ko clear understanding dikhao.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Examples dena mat bhoolna. Real-life examples se marks milte hain.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Practice Questions
          </h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium mb-2">Q1. Newton ka First Law kya kehta hai? (MCQ)</p>
                <p className="text-muted-foreground text-sm">a) Force = mass x acceleration</p>
                <p className="text-muted-foreground text-sm">b) Har action ki opposite reaction hoti hai</p>
                <p className="text-muted-foreground text-sm">c) Object apni state tab tak nahi badalta jab tak force na lage</p>
                <p className="text-muted-foreground text-sm">d) None of the above</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium">Q2. Agar mass 5 kg hai aur acceleration 2 m/s2 hai, toh force kitna hoga? (Short Answer)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium">Q3. Inertia kya hai? Ek example do. (Short Answer)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium mb-2">Q4. Third Law ka best example kaunsa hai? (MCQ)</p>
                <p className="text-muted-foreground text-sm">a) Ball girna</p>
                <p className="text-muted-foreground text-sm">b) Rocket ka udna</p>
                <p className="text-muted-foreground text-sm">c) Book table par rakhna</p>
                <p className="text-muted-foreground text-sm">d) Car ka chalna</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium">Q5. Newton ke teeno laws ko apne words mein likhiye aur ek-ek example dijiye. (Long Answer)</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Summary / Key Points</h2>
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>First Law: Objects apni state maintain karte hain jab tak external force na lage.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Second Law: F = ma (Force equals mass times acceleration).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>Third Law: Every action has an equal and opposite reaction.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span>Inertia matlab cheez ki tendency apni state maintain karne ki.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">5.</span>
                  <span>Real-life examples se concepts clear hote hain aur marks bhi milte hain.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary">
            <CardContent className="pt-6 text-center">
              <p className="text-lg font-medium text-foreground">
                Aap ye topic samajh gaye ho, ab practice karo aur confident raho. Mehnat karne wale kabhi fail nahi hote!
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    ),
  },
};

const BlogPost = () => {
  const { postId } = useParams();
  const post = postId ? blogContent[postId] : null;

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Blog post not found</h1>
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
              <Badge variant="secondary">{post.class}</Badge>
              <Badge variant="outline">{post.subject}</Badge>
              <Badge variant="outline">{post.chapter}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {post.title}
            </h1>
          </header>

          {post.content}
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
