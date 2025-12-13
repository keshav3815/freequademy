import { MessageSquare, Clock, Reply, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Doubt {
  id: string;
  studentName: string;
  subject: string;
  question: string;
  askedAt: string;
  priority: "high" | "medium" | "low";
}

const mockDoubts: Doubt[] = [
  {
    id: "1",
    studentName: "Rahul Kumar",
    subject: "Mathematics",
    question: "How do I solve quadratic equations using the discriminant method?",
    askedAt: "10 min ago",
    priority: "high",
  },
  {
    id: "2",
    studentName: "Priya Sharma",
    subject: "Physics",
    question: "Can you explain Newton's third law with examples?",
    askedAt: "25 min ago",
    priority: "medium",
  },
  {
    id: "3",
    studentName: "Amit Singh",
    subject: "Chemistry",
    question: "What is the difference between ionic and covalent bonds?",
    askedAt: "1 hour ago",
    priority: "low",
  },
];

const getPriorityColor = (priority: Doubt["priority"]) => {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
  }
};

export default function PendingDoubts() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Pending Doubts
          </span>
          <Badge variant="outline">{mockDoubts.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {mockDoubts.map((doubt) => (
              <div
                key={doubt.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{doubt.studentName}</span>
                  </div>
                  <Badge variant={getPriorityColor(doubt.priority)} className="text-xs">
                    {doubt.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {doubt.question}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {doubt.subject}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {doubt.askedAt}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Reply className="h-3 w-3" />
                    Reply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
