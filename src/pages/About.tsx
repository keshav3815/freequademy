import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function About() {
  useDocumentMeta({ title: "About", description: "What Freequademy is, and where it's still being built." });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">About Freequademy</h1>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Freequademy exists to make good learning free for students in Classes 6–12:
            courses organised by chapter, practice tests with instant, explained
            scoring, an AI doubt solver for the moment you're stuck, mentorship sessions
            with real people, and a community to learn alongside.
          </p>
          <p>
            We're early. Course content is being added subject by subject, and features
            like every part of the mentorship and community tools are built to be used
            and improved, not to look finished before they are.
          </p>
          <p>
            If something is missing, broken, or you want to help build it — as a
            student, a mentor, or a contributor — we'd like to hear from you.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 mt-8">
          <Button asChild><Link to="/signup-student">Start learning free</Link></Button>
          <Button asChild variant="outline"><Link to="/signup-mentor">Apply to mentor</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
