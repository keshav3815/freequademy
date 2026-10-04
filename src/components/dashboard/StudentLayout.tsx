import { ReactNode } from "react";
import StudentSidebar from "./StudentSidebar";

/**
 * App shell for the signed-in student area (Dashboard, My Doubts, …):
 * a persistent left sidebar instead of the public marketing Navbar/Footer.
 * Pages reached *from* the sidebar (Courses, Mock Tests, Mentorship,
 * Community, Blog) stay on their existing shared public/private layout —
 * only the pages that are exclusively part of the logged-in "app" use this.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <StudentSidebar />
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">{children}</main>
    </div>
  );
}
