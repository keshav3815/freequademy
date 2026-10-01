import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Image as ImageIcon,
  Loader2,
  MessageCircleQuestion,
  Send,
  UserCheck,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Markdown } from "@/lib/markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Must match ALLOWED_SUBJECTS in supabase/functions/doubt-solver/validation.ts
const SUBJECTS = ["General", "Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Science", "Economics", "Computer Science", "Accountancy"];
const MAX_LENGTH = 2000;

interface DoubtRow {
  id: string;
  question: string;
  subject: string;
  ai_answer: string | null;
  status: string;
  mentor_answer: string | null;
  created_at: string;
}

const statusLabel: Record<string, string> = {
  answered: "AI answered",
  escalated: "Waiting for mentor",
  mentor_answered: "Mentor answered",
};

export default function DoubtSolver({ grade }: { grade: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [doubt, setDoubt] = useState("");
  const [subject, setSubject] = useState("General");
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState<DoubtRow | null>(null);
  const [recent, setRecent] = useState<DoubtRow[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecent = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("doubts")
      .select("id, question, subject, ai_answer, status, mentor_answer, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecent(data ?? []);
  }, [user]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a PNG, JPEG, WebP or GIF image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setUploadedImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if ((!doubt.trim() && !uploadedImage) || isLoading) return;
    setIsLoading(true);
    setCurrent(null);

    try {
      const question = doubt.trim() || "Please analyse this image and help me understand it.";
      const { data, error } = await supabase.functions.invoke("doubt-solver", {
        body: {
          question,
          grade: ["6", "7", "8", "9", "10", "11", "12"].includes(grade) ? grade : undefined,
          subject,
          image: uploadedImage,
        },
      });

      if (error) {
        // Non-2xx responses carry a user-facing message in the JSON body.
        let message = "Failed to get AI response. Please try again.";
        const context = (error as { context?: Response }).context;
        if (context && typeof context.json === "function") {
          const body = await context.json().catch(() => null);
          if (body?.error) message = body.error;
        }
        throw new Error(message);
      }

      setCurrent({
        id: data?.doubtId ?? "",
        question,
        subject,
        ai_answer: data?.answer ?? "",
        status: "answered",
        mentor_answer: null,
        created_at: new Date().toISOString(),
      });
      if (typeof data?.remaining === "number") setRemaining(data.remaining);
      setDoubt("");
      removeImage();
      loadRecent();
    } catch (error) {
      toast({ title: "Could not answer", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const escalate = async () => {
    if (!current?.id) return;
    const { error } = await supabase.rpc("escalate_doubt", { _doubt_id: current.id });
    if (error) {
      toast({ title: "Could not send to a mentor", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sent to a mentor", description: "You'll find their answer under My Doubts." });
    setCurrent({ ...current, status: "escalated" });
    loadRecent();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">AI Doubt Solver</h3>
            <p className="text-xs text-muted-foreground">
              Instant answers, and a mentor can follow up{remaining !== null && ` • ${remaining} left today`}
            </p>
          </div>
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-[150px] h-8 text-xs" aria-label="Subject"><SelectValue /></SelectTrigger>
          <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {uploadedImage && (
          <div className="relative inline-block">
            <img src={uploadedImage} alt="Your uploaded question" className="max-h-32 rounded-lg border border-border" />
            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={removeImage} aria-label="Remove image">
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="relative">
          <Textarea
            placeholder="Ask your doubt here... (e.g., How to factorize polynomials?)"
            aria-label="Your question"
            value={doubt}
            onChange={(e) => setDoubt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] pr-20 resize-none"
            maxLength={MAX_LENGTH}
            disabled={isLoading}
          />
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" />
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading} onClick={() => fileInputRef.current?.click()} aria-label="Attach an image">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button size="icon" className="h-8 w-8" onClick={handleSubmit} disabled={(!doubt.trim() && !uploadedImage) || isLoading} aria-label="Ask">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="p-4 rounded-lg bg-muted/50 border flex items-center gap-2" role="status">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Thinking...</span>
          </div>
        )}

        {current?.ai_answer && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20" aria-live="polite">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-2 text-sm font-medium text-primary"><Bot className="h-4 w-4" /> AI Response</span>
              {current.status !== "answered" && <Badge variant="secondary">{statusLabel[current.status]}</Badge>}
            </div>
            <Markdown source={current.ai_answer} className="text-sm" />
            {current.mentor_answer && (
              <div className="mt-3 border-t pt-3">
                <p className="text-sm font-medium flex items-center gap-2 mb-1"><UserCheck className="h-4 w-4" /> Mentor's answer</p>
                <Markdown source={current.mentor_answer} className="text-sm" />
              </div>
            )}
            {current.status === "answered" && current.id && (
              <Button variant="outline" size="sm" className="mt-3" onClick={escalate}>
                <UserCheck className="h-4 w-4 mr-1" /> Still confused? Ask a mentor
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-3">AI can make mistakes. Check important answers with your textbook or a mentor.</p>
          </div>
        )}

        {recent.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent Doubts</p>
            <ul className="space-y-2">
              {recent.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setCurrent(d)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Bot className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                      <span className="text-sm truncate">{d.question}</span>
                    </span>
                    <Badge variant={d.status === "mentor_answered" ? "default" : "secondary"} className="text-xs shrink-0">
                      {statusLabel[d.status] ?? d.subject}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button asChild variant="ghost" className="w-full text-sm" size="sm">
          <Link to="/doubts">View all doubts <ArrowRight className="h-4 w-4 ml-1" /></Link>
        </Button>
      </div>
    </Card>
  );
}
