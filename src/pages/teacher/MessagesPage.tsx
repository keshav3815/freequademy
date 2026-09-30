import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ChevronLeft, Info, MessageSquare, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { teacherApi, useAnsweredDoubts, useEscalatedDoubts, useTeacherMutation } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Markdown } from "@/lib/markdown";
import { relativeTime } from "@/lib/teacher/format";
import { cn } from "@/lib/utils";
import { Avatar, EmptyState, ErrorState, PageHeader, Segmented, SkeletonRows, TButton, textareaClass } from "@/components/teacher/portal/ui";

type Box = "waiting" | "answered";

interface Thread {
  id: string;
  student: string;
  subject: string;
  question: string;
  ai_answer: string | null;
  note: string | null;
  at: string | null;
  answer: string | null;
  answered_at: string | null;
}

function Bubble({ who, time, children, mine }: { who: string; time: string | null; children: React.ReactNode; mine?: boolean }) {
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div className={cn("max-w-[85%] rounded-lg px-4 py-3 text-[14px]", mine ? "bg-primary text-primary-foreground" : "border border-border bg-card")}>{children}</div>
      <span className="mt-1 text-[12px] text-muted-foreground">
        {who}
        {time ? ` · ${format(new Date(time), "d MMM, h:mm a")}` : ""}
      </span>
    </div>
  );
}

/**
 * Student messages = questions students escalated from the AI doubt solver
 * to a teacher. The waiting queue is shared by all teachers; the first reply
 * answers it. (No free-form chat or attachments exist in the data model.)
 */
export default function MessagesPage() {
  useDocumentMeta({ title: "Messages" });
  const [params, setParams] = useSearchParams();
  const [box, setBox] = useState<Box>("waiting");
  const [reply, setReply] = useState("");
  const [showAi, setShowAi] = useState(false);
  const open = useEscalatedDoubts();
  const answered = useAnsweredDoubts();
  const answer = useTeacherMutation(teacherApi.answerDoubt, ["doubts"]);

  const threads = useMemo<Record<Box, Thread[]>>(
    () => ({
      waiting: (open.data ?? []).map((d) => ({ id: d.id, student: d.student_name, subject: d.subject, question: d.question, ai_answer: d.ai_answer, note: d.escalation_note, at: d.escalated_at, answer: null, answered_at: null })),
      answered: (answered.data ?? []).map((d) => ({ id: d.id, student: "Student", subject: d.subject, question: d.question, ai_answer: d.ai_answer, note: d.escalation_note, at: d.escalated_at, answer: d.mentor_answer, answered_at: d.mentor_answered_at })),
    }),
    [open.data, answered.data],
  );

  const selectedId = params.get("open");
  const selected = [...threads.waiting, ...threads.answered].find((t) => t.id === selectedId) ?? null;
  const list = threads[box];
  const query = box === "waiting" ? open : answered;

  const select = (id: string | null) => {
    setReply("");
    setShowAi(false);
    setParams(id ? { open: id } : {}, { replace: true });
  };

  const send = () => {
    if (!selected || !reply.trim()) return;
    answer.mutate([selected.id, reply.trim()], {
      onSuccess: () => {
        toast.success("Reply sent", { description: "The student sees it under My Doubts." });
        setReply("");
        const next = threads.waiting.find((t) => t.id !== selected.id);
        select(next?.id ?? null);
      },
      onError: (e) => toast.error("Could not send", { description: e.message }),
    });
  };

  return (
    <div>
      <PageHeader title="Messages" description="Questions students have sent to a teacher." />

      <div className="grid overflow-hidden rounded-lg border border-border bg-card md:h-[calc(100vh-13rem)] md:min-h-[520px] md:grid-cols-[320px_1fr]">
        <div className={cn("flex min-h-0 flex-col border-border md:border-r", selected && "hidden md:flex")}>
          <div className="border-b border-border p-3">
            <Segmented
              label="Inbox"
              value={box}
              onChange={setBox}
              className="w-full"
              options={[
                { value: "waiting", label: "Waiting", count: threads.waiting.length },
                { value: "answered", label: "Answered", count: threads.answered.length },
              ]}
            />
          </div>
          {query.isLoading ? (
            <SkeletonRows rows={6} className="p-4" />
          ) : query.isError ? (
            <ErrorState compact message="We couldn't load conversations." onRetry={() => query.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState compact icon={MessageSquare} title={box === "waiting" ? "No messages waiting" : "No answered messages yet"} description={box === "waiting" ? "Your student conversations will appear here." : undefined} />
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversations">
              {list.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => select(t.id)}
                    aria-current={t.id === selectedId ? "true" : undefined}
                    className={cn("tp-focus flex w-full gap-3 border-l-2 px-3 py-3 text-left transition-colors", t.id === selectedId ? "border-primary bg-accent/60" : "border-transparent hover:bg-muted/60")}
                  >
                    <Avatar name={t.student} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[14px] font-medium">{t.student}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(t.answered_at ?? t.at)}</span>
                      </span>
                      <span className="block text-[12px] text-muted-foreground">{t.subject}</span>
                      <span className="line-clamp-2 text-[13px] text-foreground">{t.question}</span>
                    </span>
                    {box === "waiting" && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary">
                        <span className="sr-only">Unanswered</span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="flex gap-2 border-t border-border p-3 text-[12px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            The waiting queue is shared by all teachers — the first reply answers it.
          </p>
        </div>

        <div className={cn("flex min-h-[480px] min-w-0 flex-col", !selected && "hidden md:flex")}>
          {!selected ? (
            <EmptyState icon={MessageSquare} title="Select a conversation" description="Choose a student question from the list." />
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <TButton variant="ghost" size="iconSm" className="md:hidden" onClick={() => select(null)} aria-label="Back to conversations">
                  <ChevronLeft />
                </TButton>
                <Avatar name={selected.student} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{selected.student}</p>
                  <p className="text-[12px] text-muted-foreground">{selected.subject}</p>
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
                <Bubble who={selected.student} time={selected.at}>
                  <p className="whitespace-pre-wrap">{selected.question}</p>
                  {selected.note && <p className="mt-2 border-t border-border pt-2 text-[13px] text-muted-foreground">“{selected.note}”</p>}
                </Bubble>
                {selected.ai_answer && (
                  <div className="rounded-lg border border-dashed border-border bg-card px-4 py-3">
                    <button type="button" onClick={() => setShowAi((v) => !v)} aria-expanded={showAi} className="tp-focus flex items-center gap-2 rounded text-[13px] font-medium text-muted-foreground">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      {showAi ? "Hide" : "Show"} the AI answer the student didn't find enough
                    </button>
                    {showAi && (
                      <div className="prose prose-sm mt-2 max-w-none text-[14px]">
                        <Markdown source={selected.ai_answer} />
                      </div>
                    )}
                  </div>
                )}
                {selected.answer && (
                  <Bubble who="You" time={selected.answered_at} mine>
                    <p className="whitespace-pre-wrap">{selected.answer}</p>
                  </Bubble>
                )}
              </div>
              {!selected.answer && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                  className="flex items-end gap-2 border-t border-border p-3"
                >
                  <label htmlFor="reply" className="sr-only">
                    Reply to {selected.student}
                  </label>
                  <textarea
                    id="reply"
                    className={cn(textareaClass, "min-h-[44px] flex-1 resize-none")}
                    rows={2}
                    maxLength={10000}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
                    }}
                    placeholder="Type your reply… (Ctrl+Enter to send)"
                  />
                  <TButton type="submit" loading={answer.isPending} disabled={!reply.trim()} aria-label="Send reply">
                    <Send />
                    <span className="hidden sm:inline">Send</span>
                  </TButton>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
