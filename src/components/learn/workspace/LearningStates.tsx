import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LearningLoadingState({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-20" role="status" aria-label={`Loading ${label}`}>
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  );
}

export function LearningEmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-14 px-6 text-center space-y-3">
      <Inbox className="h-7 w-7 mx-auto text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{message}</p>
      {action}
    </div>
  );
}

/** A failed request is shown as a failure with retry — never as an empty list. */
export function LearningErrorState({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border py-14 px-6 text-center space-y-3" role="alert">
      <AlertCircle className="h-7 w-7 mx-auto text-destructive" aria-hidden="true" />
      <p className="text-sm">Unable to load {label}.</p>
      <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    </div>
  );
}
