import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

/**
 * Baseline terms of service so the platform has a real page instead of a
 * 404. Template content — needs legal review before production, same as
 * PrivacyPolicy.tsx.
 */
export default function TermsOfService() {
  useDocumentMeta({ title: "Terms of Service", description: "The rules for using Freequademy." });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: this page is a working draft and has not yet had legal review.</p>

        <h2>What Freequademy is</h2>
        <p>
          Freequademy is a free learning platform for students in Classes 6–12: courses,
          practice tests, an AI doubt solver, mentorship sessions and a student community.
          Core learning features are free to use.
        </p>

        <h2>Accounts</h2>
        <ul>
          <li>You need an account to save progress, take tests, ask doubts, or take part in the community and mentorship.</li>
          <li>Give us accurate information when you sign up. Don't create an account for someone else without their knowledge.</li>
          <li>Keep your password private. You're responsible for activity on your account.</li>
        </ul>

        <h2>Community and content rules</h2>
        <p>When posting in the forum, clubs, or blog comments, don't:</p>
        <ul>
          <li>Share anyone's personal information (yours or someone else's) — phone numbers, addresses, photos.</li>
          <li>Post anything abusive, bullying, sexual, violent, or hateful.</li>
          <li>Cheat, or help others cheat, in a live exam.</li>
          <li>Impersonate another person, including mentors or Freequademy staff.</li>
        </ul>
        <p>
          Moderators and admins can remove content and, where necessary, suspend accounts
          that break these rules. The in-app "Report" button sends flagged content to a
          moderator for review.
        </p>

        <h2>Mentors</h2>
        <p>
          Mentor access is not granted automatically at signup — it requires an
          application that an administrator reviews and approves. Mentors are expected to
          give accurate, age-appropriate guidance and to treat students with respect.
        </p>

        <h2>The AI doubt solver</h2>
        <p>
          Answers come from an AI model and can be wrong. Check important answers against
          your textbook or a mentor before relying on them for an exam. The AI is meant
          for schoolwork — please don't ask it for anything outside that (and it's
          instructed to decline).
        </p>

        <h2>Content you post</h2>
        <p>
          You keep ownership of what you post (forum threads, blog posts, etc.). By
          posting, you give Freequademy permission to display it on the platform to other
          users as intended by the feature (e.g. a public forum post is shown to other
          students; a private doubt is shown only to you and, if you escalate it, to the
          mentor who answers it).
        </p>

        <h2>No warranty</h2>
        <p>
          The platform is provided "as is." We try to keep it accurate and available, but
          we don't guarantee it will be error-free, uninterrupted, or that lesson content
          is complete for every subject and class yet — new courses are still being added.
        </p>

        <h2>Changes</h2>
        <p>We may update these terms as the product changes. Continued use after an update means you accept the revised terms.</p>

        <h2>Contact</h2>
        <p>Questions about these terms: <a href="mailto:support@freequademy.com">support@freequademy.com</a>.</p>
      </main>
      <Footer />
    </div>
  );
}
