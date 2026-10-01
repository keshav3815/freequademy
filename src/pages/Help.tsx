import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Freequademy really free?",
    a: "Yes. Courses, practice tests, the AI doubt solver and mentorship sessions don't cost anything.",
  },
  {
    q: "I can't find lessons for my subject.",
    a: "Course content is still being added subject by subject, so some subjects and chapters may not have lessons or tests yet. Check back soon, or ask your question in the AI doubt solver or the community forum in the meantime.",
  },
  {
    q: "How do I become a mentor?",
    a: "Sign up from \"Sign up as Mentor\" and submit an application. Your account is a normal student account until an administrator reviews and approves the application — you'll see the status on the Mentor Application page.",
  },
  {
    q: "Is my forum post or doubt visible to everyone?",
    a: "Forum threads and replies are public to signed-in users. AI doubts are private to you, unless you choose \"Ask a mentor\", in which case a mentor can see and answer that specific question.",
  },
  {
    q: "Something feels wrong or unsafe in a conversation.",
    a: "Use the Report button on the post or reply. It goes straight to a moderator. If you're in immediate distress, please talk to a trusted adult — a parent, teacher, or school counsellor — first.",
  },
  {
    q: "How do I contact support?",
    a: "Email support@freequademy.com.",
  },
];

export default function Help() {
  useDocumentMeta({ title: "Help & FAQ", description: "Answers to common questions about using Freequademy." });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Help & FAQ</h1>
        <div className="space-y-4">
          {FAQS.map((item) => (
            <Card key={item.q}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
