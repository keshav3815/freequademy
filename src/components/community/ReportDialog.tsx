import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/** Lets a signed-in user flag content for moderator review (user_reports). */
export default function ReportDialog({ contentLink, label = "Report" }: { contentLink: string; label?: string }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const submit = async () => {
    if (reason.trim().length < 5) return;
    setSubmitting(true);
    const { error } = await supabase.from("user_reports").insert({
      reported_by: user.id,
      reporter_name: profile?.full_name || "Student",
      reason: reason.trim().slice(0, 1000),
      content_link: contentLink,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not send report", variant: "destructive" });
      return;
    }
    toast({ title: "Report sent", description: "Thank you. A moderator will review it." });
    setReason("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag className="h-4 w-4 mr-1" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>Tell our moderators what is wrong with this content.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          placeholder="e.g. spam, bullying, unsafe link…"
          aria-label="Reason for report"
        />
        <Button onClick={submit} disabled={submitting || reason.trim().length < 5}>
          Send report
        </Button>
      </DialogContent>
    </Dialog>
  );
}
