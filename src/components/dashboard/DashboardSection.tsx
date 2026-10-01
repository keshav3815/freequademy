import { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props<T> {
  query: { isLoading: boolean; isError: boolean; data: T | undefined; refetch: () => void };
  title?: string;
  minHeight?: number;
  children: (data: T) => ReactNode;
}

/**
 * Loading / error / data wrapper for one dashboard section. A query error
 * renders a retry prompt — never silently falls through to "0" or an empty
 * card, which would misrepresent a fetch failure as "no activity" (the
 * exact failure mode the product brief calls out explicitly).
 */
export default function DashboardSection<T>({ query, title, minHeight = 160, children }: Props<T>) {
  if (query.isLoading) {
    return (
      <Card className="p-5 flex items-center justify-center" style={{ minHeight }} role="status" aria-label={title ? `Loading ${title}` : "Loading"}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (query.isError) {
    return (
      <Card className="p-5 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight }}>
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Unable to load {title ?? "this section"}.</p>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>Retry</Button>
      </Card>
    );
  }

  return <>{children(query.data as T)}</>;
}
