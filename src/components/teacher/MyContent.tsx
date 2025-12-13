import { Video, FileText, ClipboardList, CheckCircle, Clock, XCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Content {
  id: string;
  title: string;
  type: "video" | "notes" | "test";
  status: "live" | "review" | "rejected";
  views?: number;
  uploadedAt: string;
  rejectionReason?: string;
}

const mockContent: Content[] = [
  {
    id: "1",
    title: "Algebra Basics - Part 1",
    type: "video",
    status: "live",
    views: 245,
    uploadedAt: "2 days ago",
  },
  {
    id: "2",
    title: "Quadratic Equations Notes",
    type: "notes",
    status: "live",
    views: 189,
    uploadedAt: "1 week ago",
  },
  {
    id: "3",
    title: "Newton's Laws Explained",
    type: "video",
    status: "review",
    uploadedAt: "1 hour ago",
  },
  {
    id: "4",
    title: "Chemistry Mock Test - Chapter 5",
    type: "test",
    status: "rejected",
    uploadedAt: "3 days ago",
    rejectionReason: "Test questions need more clarity",
  },
];

const getTypeIcon = (type: Content["type"]) => {
  switch (type) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "notes":
      return <FileText className="h-4 w-4" />;
    case "test":
      return <ClipboardList className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: Content["status"]) => {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Live
        </Badge>
      );
    case "review":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Under Review
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
  }
};

export default function MyContent() {
  const liveContent = mockContent.filter((c) => c.status === "live");
  const reviewContent = mockContent.filter((c) => c.status === "review");
  const rejectedContent = mockContent.filter((c) => c.status === "rejected");

  const ContentItem = ({ content }: { content: Content }) => (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {getTypeIcon(content.type)}
          <span className="font-medium text-sm line-clamp-1">{content.title}</span>
        </div>
        {getStatusBadge(content.status)}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{content.uploadedAt}</span>
        {content.views !== undefined && (
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {content.views} views
          </span>
        )}
      </div>
      {content.rejectionReason && (
        <p className="text-xs text-red-500 mt-2 bg-red-500/10 p-2 rounded">
          Reason: {content.rejectionReason}
        </p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            My Content
          </span>
          <Badge variant="outline">{mockContent.length} items</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="live">Live ({liveContent.length})</TabsTrigger>
            <TabsTrigger value="review">Review ({reviewContent.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedContent.length})</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[220px] pr-2">
            <TabsContent value="all" className="space-y-2 mt-0">
              {mockContent.map((content) => (
                <ContentItem key={content.id} content={content} />
              ))}
            </TabsContent>

            <TabsContent value="live" className="space-y-2 mt-0">
              {liveContent.map((content) => (
                <ContentItem key={content.id} content={content} />
              ))}
            </TabsContent>

            <TabsContent value="review" className="space-y-2 mt-0">
              {reviewContent.map((content) => (
                <ContentItem key={content.id} content={content} />
              ))}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-2 mt-0">
              {rejectedContent.map((content) => (
                <ContentItem key={content.id} content={content} />
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
