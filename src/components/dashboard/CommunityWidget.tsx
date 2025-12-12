import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Users2, 
  TrendingUp,
  ArrowRight,
  ThumbsUp,
  MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommunityWidgetProps {
  grade: string;
}

export default function CommunityWidget({ grade }: CommunityWidgetProps) {
  const navigate = useNavigate();

  const trendingDiscussions = [
    { 
      title: "Tips for solving quadratic equations faster", 
      replies: 24, 
      likes: 45,
      category: "Math"
    },
    { 
      title: "Best resources for Class 10 Science", 
      replies: 18, 
      likes: 32,
      category: "Science"
    },
    { 
      title: "How to prepare for board exams?", 
      replies: 56, 
      likes: 89,
      category: "General"
    },
  ];

  const activeClubs = [
    { name: "Science Explorers", members: 234 },
    { name: "Math Wizards", members: 189 },
  ];

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <MessageSquare className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold">Community</h3>
            <p className="text-xs text-muted-foreground">Class {grade} discussions</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Active
        </Badge>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Trending Discussions</p>
        <div className="space-y-2">
          {trendingDiscussions.map((discussion, i) => (
            <div 
              key={i} 
              className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium line-clamp-1">{discussion.title}</p>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {discussion.category}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {discussion.replies}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {discussion.likes}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 pt-3 border-t">
        <p className="text-xs font-medium text-muted-foreground mb-2">Your Clubs</p>
        <div className="flex gap-2 flex-wrap">
          {activeClubs.map((club, i) => (
            <Badge 
              key={i} 
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10 transition-colors"
            >
              <Users2 className="h-3 w-3 mr-1" />
              {club.name}
              <span className="ml-1 text-muted-foreground">({club.members})</span>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1 text-sm" 
          size="sm"
          onClick={() => navigate("/community")}
        >
          Ask Question
        </Button>
        <Button 
          variant="ghost" 
          className="flex-1 text-sm" 
          size="sm"
          onClick={() => navigate("/community")}
        >
          Browse Forum <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
