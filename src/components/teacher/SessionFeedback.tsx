import { Star, MessageCircle, User, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Feedback {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  sessionDate: string;
  subject: string;
}

const mockFeedback: Feedback[] = [
  {
    id: "1",
    studentName: "Ananya Gupta",
    rating: 5,
    comment: "Excellent explanation! Cleared all my doubts about integration.",
    sessionDate: "Dec 12, 2024",
    subject: "Mathematics",
  },
  {
    id: "2",
    studentName: "Vikram Patel",
    rating: 4,
    comment: "Very helpful session. Would like more practice problems next time.",
    sessionDate: "Dec 10, 2024",
    subject: "Physics",
  },
  {
    id: "3",
    studentName: "Sneha Reddy",
    rating: 5,
    comment: "Best mentor! Makes complex topics so easy to understand.",
    sessionDate: "Dec 8, 2024",
    subject: "Chemistry",
  },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 ${
          star <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
        }`}
      />
    ))}
  </div>
);

export default function SessionFeedback() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Recent Feedback
          </span>
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            4.7 avg
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[220px] pr-2">
          <div className="space-y-3">
            {mockFeedback.map((feedback) => (
              <div
                key={feedback.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{feedback.studentName}</span>
                  </div>
                  <StarRating rating={feedback.rating} />
                </div>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  "{feedback.comment}"
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {feedback.subject}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {feedback.sessionDate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
