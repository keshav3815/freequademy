/**
 * Static content for the public landing page.
 *
 * Everything here is marketing copy or clearly illustrative sample data. None
 * of it is fetched from Supabase, and none of it should be presented as real
 * usage numbers, ratings or testimonials.
 */
import {
  BookOpen,
  ClipboardCheck,
  Compass,
  GraduationCap,
  HeartHandshake,
  MessageCircleQuestion,
  MessagesSquare,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/** A destination is either a router path ("/courses") or an on-page anchor ("#ai-help"). */
export type Href = `/${string}` | `#${string}`;

export interface NavLink {
  label: string;
  href: Href;
}

export const navLinks: readonly NavLink[] = [
  { label: "Learn", href: "/courses" },
  { label: "Practice", href: "/tests" },
  // The doubt solver itself lives inside the signed-in dashboard, so the nav
  // points at the section that explains it.
  { label: "AI Help", href: "#ai-help" },
  { label: "Mentorship", href: "/mentorship" },
  { label: "Community", href: "/community" },
];

export interface Pillar {
  icon: LucideIcon;
  title: string;
  body: string;
}

export const pillars: readonly Pillar[] = [
  { icon: BookOpen, title: "Learn", body: "Structured lessons for your class and subjects." },
  { icon: ClipboardCheck, title: "Practice", body: "Tests that reinforce what you've learned." },
  { icon: Sparkles, title: "AI Help", body: "Explanations when you're stuck on a doubt." },
  { icon: HeartHandshake, title: "Mentorship", body: "Guidance from people who've been there." },
  { icon: MessagesSquare, title: "Community", body: "Learn alongside other students." },
];

export type FeatureKey = "learn" | "practice" | "ai" | "mentorship" | "community" | "progress";

export interface Feature {
  key: FeatureKey;
  icon: LucideIcon;
  title: string;
  body: string;
  href: Href;
  cta: string;
}

export const features: readonly Feature[] = [
  {
    key: "learn",
    icon: BookOpen,
    title: "Learn",
    body: "Courses, lessons and study material organised by class and subject, so you always know what comes next.",
    href: "/courses",
    cta: "Browse courses",
  },
  {
    key: "ai",
    icon: Sparkles,
    title: "AI Doubt Solver",
    body: "Type a question, or upload a photo of it, and get a step-by-step explanation pitched at your class.",
    href: "#ai-help",
    cta: "See how it works",
  },
  {
    key: "practice",
    icon: ClipboardCheck,
    title: "Practice",
    body: "Practice sets, chapter-wise tests and full-length papers to check what you really know.",
    href: "/tests",
    cta: "Try a test",
  },
  {
    key: "mentorship",
    icon: HeartHandshake,
    title: "Mentorship",
    body: "Pair what you learn with human guidance through mentorship programs and sessions.",
    href: "/mentorship",
    cta: "Explore mentorship",
  },
  {
    key: "community",
    icon: MessagesSquare,
    title: "Community",
    body: "Forums, study clubs and events where students ask, answer and learn together.",
    href: "/community",
    cta: "Visit the community",
  },
  {
    key: "progress",
    icon: TrendingUp,
    title: "Progress",
    body: "See what you've covered, where you're strong and which topics need another look.",
    href: "/tests",
    cta: "Start practising",
  },
];

export interface JourneyStep {
  icon: LucideIcon;
  title: string;
  summary: string;
  detail: string;
  points: readonly string[];
  href: Href;
  cta: string;
}

export const journey: readonly JourneyStep[] = [
  {
    icon: Compass,
    title: "Discover",
    summary: "Find your starting point.",
    detail: "Pick your class and subjects and see what there is to learn.",
    points: ["Classes 6 to 12", "Subject-wise course list", "Start wherever you are"],
    href: "/courses",
    cta: "Browse by class",
  },
  {
    icon: BookOpen,
    title: "Learn",
    summary: "Build understanding step by step.",
    detail: "Work through lessons at your own pace and pick up where you left off.",
    points: ["Lessons grouped by chapter", "Continue where you stopped", "Recommended next lesson"],
    href: "/courses",
    cta: "Start a course",
  },
  {
    icon: ClipboardCheck,
    title: "Practice",
    summary: "Test what you know.",
    detail: "Apply concepts with practice sets, chapter-wise tests and full papers.",
    points: ["Practice sets", "Chapter-wise tests", "Full-length papers"],
    href: "/tests",
    cta: "Open practice tests",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask",
    summary: "Don't stay stuck.",
    detail: "Ask the AI doubt solver for an explanation, or take your question to the community.",
    points: ["Type or upload a photo of your doubt", "Step-by-step explanations", "Ask again to go deeper"],
    href: "#ai-help",
    cta: "See the doubt solver",
  },
  {
    icon: TrendingUp,
    title: "Improve",
    summary: "Close the gaps.",
    detail: "Use test results to see which topics are strong and which need another pass.",
    points: ["Topic-level results", "Strengths and gaps", "A clear next step"],
    href: "/tests",
    cta: "Find your gaps with a test",
  },
  {
    icon: MessagesSquare,
    title: "Connect",
    summary: "Learn with others.",
    detail: "Join discussions, study clubs and events with students working on the same things.",
    points: ["Discussion forums", "Study clubs", "Learning events"],
    href: "/community",
    cta: "Visit the community",
  },
  {
    icon: GraduationCap,
    title: "Get Mentored",
    summary: "Get guidance on the bigger picture.",
    detail: "Work with a mentor on goals, study plans and what to focus on next.",
    points: ["Mentorship programs", "One-on-one sessions", "Feedback and next steps"],
    href: "/mentorship",
    cta: "Explore mentorship",
  },
];

export interface AiSample {
  id: string;
  subject: string;
  grade: string;
  concept: string;
  question: string;
  answer: string;
  followUps: readonly string[];
}

/** Hand-written sample conversations for the marketing visual. No API calls. */
export const aiSamples: readonly AiSample[] = [
  {
    id: "photosynthesis",
    subject: "Biology",
    grade: "Class 7",
    concept: "Photosynthesis",
    question: "Explain photosynthesis in simple terms.",
    answer:
      "Think of a leaf as a tiny kitchen. It takes in water from the roots and carbon dioxide from the air, and uses sunlight as the energy to cook them into glucose, a sugar the plant uses as food. Oxygen is the leftover, so the leaf releases it into the air. In short: water + carbon dioxide + sunlight → glucose + oxygen.",
    followUps: ["Why are leaves green?", "What happens at night?", "Give me a quick quiz"],
  },
  {
    id: "quadratics",
    subject: "Mathematics",
    grade: "Class 10",
    concept: "Quadratic equations",
    question: "Why does a quadratic equation have two answers?",
    answer:
      "A quadratic has an x² term, so its graph is a U-shaped curve called a parabola. Solving ax² + bx + c = 0 means finding where that curve crosses the x-axis. A U-shape can cross the axis twice, touch it once, or miss it completely. That's why you can get two answers, one repeated answer, or no real answers. The discriminant, b² − 4ac, tells you which case you're in.",
    followUps: ["What is the discriminant?", "Show me a worked example", "Draw the three cases"],
  },
  {
    id: "inertia",
    subject: "Physics",
    grade: "Class 9",
    concept: "Inertia",
    question: "Why do I jerk backwards when a bus suddenly starts?",
    answer:
      "Your body wants to keep doing what it was already doing. This tendency is called inertia. When the bus starts, your feet move forward with the floor, but the upper part of your body is still at rest, so it seems to fall backwards. Nothing is pushing you back. Your body is just catching up. This is Newton's first law of motion in action.",
    followUps: ["What happens when the bus brakes?", "Is mass related to inertia?", "Give me an example at home"],
  },
];

export interface EcosystemNode {
  key: FeatureKey;
  label: string;
  icon: LucideIcon;
  connects: string;
}

export const ecosystemNodes: readonly EcosystemNode[] = [
  { key: "learn", label: "Learn", icon: BookOpen, connects: "Lessons set up what you practise next." },
  { key: "practice", label: "Practice", icon: ClipboardCheck, connects: "Test results show what to revisit or ask about." },
  { key: "ai", label: "AI Help", icon: Sparkles, connects: "Doubts get explained right when they come up." },
  { key: "progress", label: "Progress", icon: TrendingUp, connects: "Your progress shapes what to study and discuss next." },
  { key: "community", label: "Community", icon: MessagesSquare, connects: "Classmates and mentors add context the lessons miss." },
  { key: "mentorship", label: "Mentorship", icon: HeartHandshake, connects: "Mentors turn progress into a plan." },
];

export interface Principle {
  title: string;
  body: string;
}

export const principles: readonly Principle[] = [
  {
    title: "One learning journey",
    body: "Lessons, practice, help and guidance belong in one place, not scattered across a dozen apps.",
  },
  { title: "Help when you're stuck", body: "A question you can't answer shouldn't stop your progress for the day." },
  { title: "Practice matters", body: "Understanding grows when you apply it, get it wrong and try again." },
  { title: "Human guidance matters", body: "Technology can explain. Mentors add judgement, encouragement and direction." },
  { title: "Learning is social", body: "Studying alongside others adds another layer of support." },
];

export interface FooterLink {
  label: string;
  /** Omitted when the destination does not exist yet; rendered as "Soon" instead of a link. */
  href?: Href;
}

export interface FooterColumn {
  title: string;
  links: readonly FooterLink[];
}

export const footerColumns: readonly FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Learn", href: "/courses" },
      { label: "Practice", href: "/tests" },
      { label: "AI Help", href: "#ai-help" },
      { label: "Mentorship", href: "/mentorship" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Learning resources", href: "/courses" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discussions", href: "/community" },
      { label: "Events", href: "/community" },
      { label: "Clubs", href: "/community" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#why" },
      { label: "Become a mentor", href: "/signup-mentor" },
      { label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [{ label: "Privacy" }, { label: "Terms" }],
  },
];
