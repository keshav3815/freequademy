import { Suspense, useCallback, useEffect, useState, type CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import TeacherSidebar from "./TeacherSidebar";
import TeacherHeader from "./TeacherHeader";
import "./portal.css";

const COLLAPSE_KEY = "tp:sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function PageFallback() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded" />
        <Skeleton className="h-4 w-96 max-w-full rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

/**
 * App shell for /teacher/*: sticky collapsible sidebar (drawer on mobile),
 * global header, and a readable-width content column. The layout stays
 * mounted while pages change, so navigation never re-renders the chrome.
 */
export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  // Scope the portal's design tokens to while the portal is on screen
  // (see portal.css for why this is on <html>).
  useEffect(() => {
    document.documentElement.classList.add("teacher-portal");
    return () => document.documentElement.classList.remove("teacher-portal");
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    document.getElementById("tp-main")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }, []);

  return (
    <div
      className="tp-root min-h-screen bg-background text-foreground"
      // lets fixed, full-width bars (e.g. editor action bars) align with the content column
      style={{ "--tp-content-left": collapsed ? "68px" : "240px" } as CSSProperties}
    >
      <a href="#tp-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <TeacherSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0 [&>button]:right-3 [&>button]:top-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <TeacherSidebar collapsed={false} variant="drawer" onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-[68px]" : "lg:pl-60")}>
        <TeacherHeader onOpenMenu={() => setDrawerOpen(true)} />
        <main id="tp-main" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
