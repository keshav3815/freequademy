import { Video, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GoLiveButtonProps {
  hasUpcomingSession: boolean;
  sessionStartsIn?: number; // minutes
  onGoLive: () => void;
}

export default function GoLiveButton({
  hasUpcomingSession,
  sessionStartsIn,
  onGoLive,
}: GoLiveButtonProps) {
  const isSessionSoon = sessionStartsIn !== undefined && sessionStartsIn <= 15;

  if (!hasUpcomingSession) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Video className="h-4 w-4" />
        No Upcoming Session
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {sessionStartsIn !== undefined && (
        <Badge
          variant={isSessionSoon ? "destructive" : "secondary"}
          className="flex items-center gap-1"
        >
          <Clock className="h-3 w-3" />
          {sessionStartsIn <= 0 ? "Now" : `${sessionStartsIn} min`}
        </Badge>
      )}
      <Button
        variant={isSessionSoon ? "default" : "outline"}
        onClick={onGoLive}
        className={`gap-2 ${isSessionSoon ? "animate-pulse bg-gradient-to-r from-primary to-primary/80" : ""}`}
      >
        <Video className="h-4 w-4" />
        {isSessionSoon ? "Go Live" : "Start Session"}
      </Button>
    </div>
  );
}
