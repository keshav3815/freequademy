import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

/**
 * Baseline privacy policy so the platform has a real page instead of a 404.
 * This is a template, not a substitute for legal review — Freequademy serves
 * minors (Classes 6–12), so review against India's DPDP Act 2023 (which has
 * specific rules for processing children's data, including verifiable
 * parental consent) is a prerequisite for production, not optional polish.
 */
export default function PrivacyPolicy() {
  useDocumentMeta({ title: "Privacy Policy", description: "How Freequademy collects, uses and protects your data." });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: this page is a working draft and has not yet had legal review.</p>

        <h2>Who this applies to</h2>
        <p>
          Freequademy is used by students in Classes 6–12, many of whom are minors under
          Indian law. Where a parent or guardian's consent is legally required for us to
          process a student's personal data, we have not yet built the verified-consent
          flow that requires, and this policy will be updated once that exists — until
          then, a parent or guardian should be involved in account creation for any
          student under 18.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email address, class/grade, and password (stored hashed by Supabase Auth, never in plain text).</li>
          <li>Content you create: forum posts and replies, club posts, doubts you ask the AI tutor, blog posts (mentors), mentorship session details, test attempts and scores.</li>
          <li>Basic usage data needed to run the product: which lessons you've completed, when you were last active (used only to show your own streak and progress).</li>
        </ul>

        <h2>What we do not do</h2>
        <ul>
          <li>We do not sell personal data.</li>
          <li>We do not run third-party advertising trackers on this site.</li>
          <li>We do not ask the AI doubt-solver to collect personal information from students — if a doubt session asks you for personal details, that's a bug, please report it.</li>
        </ul>

        <h2>Third parties we use</h2>
        <p>
          Supabase hosts our database, authentication and file storage. Our AI doubt
          solver sends the text (and, if attached, image) of your question, along with
          your grade, to an AI model provider to generate an answer — nothing else about
          your account is sent. We do not currently process payments; if that changes,
          this policy will be updated with the payment provider's name before launch.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask us to see, correct, or delete your personal data by emailing{" "}
          <a href="mailto:support@freequademy.com">support@freequademy.com</a>. Account
          self-service (edit profile, delete account) is planned but not built yet — until
          it is, requests are handled manually.
        </p>

        <h2>Children's data</h2>
        <p>
          If you are a parent or guardian and believe your child has provided personal
          information without your consent, contact us at the email above and we will
          work with you to review and, where appropriate, remove it.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We'll post updates on this page. Material changes affecting how student data is
          handled will be communicated more directly once we have a way to do that (e.g.
          email or in-app notice).
        </p>

        <h2>Contact</h2>
        <p>Questions about this policy: <a href="mailto:support@freequademy.com">support@freequademy.com</a>.</p>
      </main>
      <Footer />
    </div>
  );
}
