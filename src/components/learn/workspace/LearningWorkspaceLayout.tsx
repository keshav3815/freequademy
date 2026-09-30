import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { PanelLeft } from "lucide-react";
import StudentLayout from "@/components/dashboard/StudentLayout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Props {
  title: string;
  sidebar: (close: () => void) => ReactNode;
  children: ReactNode;
}

/**
 * Global sidebar + module sidebar + content. The module sidebar is a
 * permanent column only on wide screens (xl); below that it becomes a
 * "Browse" drawer so the two navigation columns never crowd out the content.
 */
export default function LearningWorkspaceLayout({ title, sidebar, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  const close = () => setDrawerOpen(false);

  return (
    <StudentLayout>
      <div className="flex min-h-screen">
        <aside className="hidden xl:block w-[272px] shrink-0 border-r border-border/70 bg-card sticky top-0 h-screen overflow-y-auto">
          {sidebar(close)}
        </aside>

        <div className="flex-1 min-w-0">
          <div className="xl:hidden sticky top-16 lg:top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-between">
            <span className="font-medium text-sm">{title}</span>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <PanelLeft className="h-4 w-4" /> Browse
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
                <SheetTitle className="sr-only">{title} navigation</SheetTitle>
                <SheetDescription className="sr-only">Browse {title} by section, subject and chapter.</SheetDescription>
                {sidebar(close)}
              </SheetContent>
            </Sheet>
          </div>

          <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto space-y-6">{children}</div>
        </div>
      </div>
    </StudentLayout>
  );
}
