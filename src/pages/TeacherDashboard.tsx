import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings, Video, Clock, User, Upload, Calendar as CalendarIcon, 
  PhoneCall, BookOpen, FileText, GraduationCap, StickyNote
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { toast } from "sonner";
import NotificationBell from "@/components/teacher/NotificationBell";
import GoLiveButton from "@/components/teacher/GoLiveButton";
import SessionFilters, { SessionFilterValues } from "@/components/teacher/SessionFilters";
import PendingDoubts from "@/components/teacher/PendingDoubts";
import MyContent from "@/components/teacher/MyContent";
import TeacherStats from "@/components/teacher/TeacherStats";
import SessionFeedback from "@/components/teacher/SessionFeedback";

interface Session {
  id: string;
  studentName: string;
  studentClass: string;
  subject: string;
  date: Date;
  time: string;
  duration: string;
  type: "Mentorship" | "Doubt";
  status: "upcoming" | "pending" | "past";
  isLive?: boolean;
  reason?: string;
}

const mockSessions: Session[] = [
  {
    id: "1",
    studentName: "John Doe",
    studentClass: "Class 10",
    subject: "Mathematics",
    date: new Date(),
    time: "10:00 AM",
    duration: "45 min",
    type: "Mentorship",
    status: "upcoming",
    isLive: true,
    reason: "Career guidance in STEM",
  },
  {
    id: "2",
    studentName: "Sarah Smith",
    studentClass: "Class 12",
    subject: "Physics",
    date: new Date(Date.now() + 86400000),
    time: "2:00 PM",
    duration: "30 min",
    type: "Doubt",
    status: "upcoming",
    reason: "Help with Newton's Laws",
  },
  {
    id: "3",
    studentName: "Mike Johnson",
    studentClass: "Class 11",
    subject: "Chemistry",
    date: new Date(Date.now() + 172800000),
    time: "11:00 AM",
    duration: "45 min",
    type: "Mentorship",
    status: "pending",
    reason: "Weekly mentorship session",
  },
  {
    id: "4",
    studentName: "Emily Brown",
    studentClass: "Class 9",
    subject: "Mathematics",
    date: new Date(Date.now() - 172800000),
    time: "3:00 PM",
    duration: "30 min",
    type: "Doubt",
    status: "past",
    reason: "Quadratic equations",
  },
];

export default function TeacherDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filters, setFilters] = useState<SessionFilterValues>({
    subject: "All Subjects",
    class: "All Classes",
    sessionType: "All Types",
    duration: "All Durations",
  });
  const [showDaySessions, setShowDaySessions] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 300);
  };

  const handleGoLive = () => {
    toast.success("Joining session...", { description: "Opening video call" });
  };

  const filterSessions = (sessions: Session[]) => {
    return sessions.filter((session) => {
      if (filters.subject !== "All Subjects" && session.subject !== filters.subject) return false;
      if (filters.class !== "All Classes" && session.studentClass !== filters.class) return false;
      if (filters.sessionType !== "All Types" && session.type !== filters.sessionType) return false;
      if (filters.duration !== "All Durations" && session.duration !== filters.duration) return false;
      return true;
    });
  };

  const getSessionsForDate = (date: Date) => {
    return mockSessions.filter((s) => isSameDay(s.date, date));
  };

  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];
  const hasUpcomingSession = mockSessions.some((s) => s.status === "upcoming" && s.isLive);

  const SessionCard = ({ session }: { session: Session }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{session.studentName}</span>
              <Badge variant="outline" className="text-xs">{session.studentClass}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(session.date, "MMM dd, yyyy")}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {session.time}
              </div>
              <span>• {session.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <GraduationCap className="h-3 w-3 mr-1" />
                {session.subject}
              </Badge>
              <Badge variant={session.type === "Mentorship" ? "default" : "outline"}>
                {session.type}
              </Badge>
            </div>
            {session.reason && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <span className="font-medium">Reason:</span> {session.reason}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {session.status === "upcoming" && (
              <Button
                variant={session.isLive ? "default" : "outline"}
                size="sm"
                className={session.isLive ? "animate-pulse" : ""}
                onClick={handleGoLive}
              >
                <PhoneCall className="h-4 w-4 mr-1" />
                {session.isLive ? "Join Now" : "Start"}
              </Button>
            )}
            {session.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" variant="default">Accept</Button>
                <Button size="sm" variant="outline">Decline</Button>
              </div>
            )}
            <Button variant="ghost" size="sm" className="text-xs">
              <StickyNote className="h-3 w-3 mr-1" />
              Notes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your sessions, content, and students</p>
          </div>
          
          <div className="flex items-center gap-3">
            <GoLiveButton
              hasUpcomingSession={hasUpcomingSession}
              sessionStartsIn={5}
              onGoLive={handleGoLive}
            />
            
            <NotificationBell />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Availability Settings</DialogTitle>
                  <DialogDescription>
                    Set your available hours and manage preferences
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Weekly Recurring Slots</h4>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                      <div key={day} className="flex items-center justify-between">
                        <Label className="text-sm">{day}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            defaultValue="9:00 AM - 5:00 PM"
                            className="w-40 text-sm"
                          />
                          <Switch defaultChecked />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-medium text-sm">Preferences</h4>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Session reminders (15 min before)</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Daily summary email</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Dark mode</Label>
                      <Switch />
                    </div>
                  </div>
                </div>
                <Button className="w-full">Save Changes</Button>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Content
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Upload Content</DialogTitle>
                  <DialogDescription>
                    Add videos, notes, or tests to your course content
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="video" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="video"><Video className="h-4 w-4 mr-1" />Video</TabsTrigger>
                    <TabsTrigger value="notes"><FileText className="h-4 w-4 mr-1" />Notes</TabsTrigger>
                    <TabsTrigger value="test"><BookOpen className="h-4 w-4 mr-1" />Test</TabsTrigger>
                  </TabsList>
                  <TabsContent value="video" className="space-y-4 pt-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        {uploadedFile ? uploadedFile.name : "Drag & drop your video here"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">or</p>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Button variant="outline" asChild>
                          <span>Click to browse</span>
                        </Button>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept="video/*"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </div>
                    {uploadProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="title">Lesson Title</Label>
                      <Input id="title" placeholder="Enter lesson title" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Enter lesson description" className="min-h-[80px]" />
                    </div>
                    <Button className="w-full" disabled={!uploadedFile || uploadProgress < 100}>
                      Upload Lesson
                    </Button>
                  </TabsContent>
                  <TabsContent value="notes" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Notes Title</Label>
                      <Input placeholder="Enter notes title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Upload PDF</Label>
                      <Input type="file" accept=".pdf" />
                    </div>
                    <Button className="w-full">Upload Notes</Button>
                  </TabsContent>
                  <TabsContent value="test" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Test Title</Label>
                      <Input placeholder="Enter test title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input type="number" placeholder="60" />
                    </div>
                    <Button className="w-full">Create Test</Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Sessions */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  1-on-1 Sessions
                </CardTitle>
                <CardDescription>Manage your mentorship and doubt sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <SessionFilters filters={filters} onFilterChange={setFilters} />
                
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upcoming">
                      Upcoming ({filterSessions(mockSessions.filter(s => s.status === "upcoming")).length})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      Pending ({filterSessions(mockSessions.filter(s => s.status === "pending")).length})
                    </TabsTrigger>
                    <TabsTrigger value="past">
                      Past ({filterSessions(mockSessions.filter(s => s.status === "past")).length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upcoming" className="space-y-4 mt-4">
                    {filterSessions(mockSessions.filter((s) => s.status === "upcoming")).map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="pending" className="space-y-4 mt-4">
                    {filterSessions(mockSessions.filter((s) => s.status === "pending")).map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="past" className="space-y-4 mt-4">
                    {filterSessions(mockSessions.filter((s) => s.status === "past")).map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* My Content & Pending Doubts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <MyContent />
              <PendingDoubts />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Calendar with Day Sessions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  Calendar
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Set Availability</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Block Dates</DialogTitle>
                        <DialogDescription>Mark dates as unavailable</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Calendar
                          mode="multiple"
                          className="rounded-md border pointer-events-auto"
                        />
                        <Button className="w-full">Save Blocked Dates</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setShowDaySessions(true);
                  }}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    booked: mockSessions.map((s) => s.date),
                  }}
                  modifiersStyles={{
                    booked: {
                      fontWeight: "bold",
                      backgroundColor: "hsl(var(--primary) / 0.15)",
                      borderRadius: "50%",
                    },
                  }}
                />
                
                {showDaySessions && selectedDate && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">
                      Sessions on {format(selectedDate, "MMM dd")}
                    </h4>
                    <ScrollArea className="h-[120px]">
                      {selectedDateSessions.length > 0 ? (
                        <div className="space-y-2">
                          {selectedDateSessions.map((session) => (
                            <div
                              key={session.id}
                              className="p-2 rounded bg-muted/50 text-sm flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium">{session.studentName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {session.time} • {session.subject}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {session.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No sessions scheduled</p>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <TeacherStats />

            {/* Session Feedback */}
            <SessionFeedback />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
