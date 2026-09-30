import { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
  /** Roles allowed to view the route. Omit to allow any signed-in user. */
  allow?: AppRole[];
}

/**
 * UI-level route guard. It improves UX and stops protected pages rendering for
 * the wrong audience; the actual data protection is RLS in the database.
 */
export default function RequireAuth({ children, allow }: RequireAuthProps) {
  const { loading, isAuthenticated, isAdmin, isModerator, isMentor } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (allow) {
    const held: AppRole[] = ["student"];
    if (isMentor) held.push("mentor");
    if (isModerator) held.push("moderator");
    if (isAdmin) held.push("admin");

    if (!allow.some((role) => held.includes(role))) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
            <Button asChild>
              <Link to="/">Go to home</Link>
            </Button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
