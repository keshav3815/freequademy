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
import { Settings, Video, Clock, User, Upload, Calendar as CalendarIcon, PhoneCall, BookOpen } from "lucide-react";
import { format } from "date-fns";

interface Session {
  id: string;
  studentName: string;
  date: Date;
  time: string;
  duration: string;
  type: "Mentorship" | "Doubt";
  status: "upcoming" | "pending" | "past";
  isLive?: boolean;
}

const mockSessions: Session[] = [
  {
    id: "1",
    studentName: "John Doe",
    date: new Date(2025, 0, 10),
    time: "10:00 AM",
    duration: "45 min",
    type: "Mentorship",
    status: "upcoming",
    isLive: true,
  },
  {
    id: "2",
    studentName: "Sarah Smith",
    date: new Date(2025, 0, 11),
    time: "2:00 PM",
    duration: "30 min",
    type: "Doubt",
    status: "upcoming",
  },
  {
    id: "3",
    studentName: "Mike Johnson",
    date: new Date(2025, 0, 9),
    time: "11:00 AM",
    duration: "45 min",
    type: "Mentorship",
    status: "pending",
  },
  {
    id: "4",
    studentName: "Emily Brown",
    date: new Date(2025, 0, 5),
    time: "3:00 PM",
    duration: "30 min",
    type: "Doubt",
    status: "past",
  },
];

export default function TeacherDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 300);
  };

  const SessionCard = ({ session }: { session: Session }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{session.studentName}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={session.type === "Mentorship" ? "default" : "secondary"}>
              {session.type}
            </Badge>
            {session.status === "upcoming" && (
              <Button
                variant={session.isLive ? "default" : "outline"}
                size="sm"
                className={session.isLive ? "animate-pulse bg-gradient" : ""}
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                {session.isLive ? "Join Now" : "Start Call"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your sessions and content</p>
          </div>
          
          <div className="flex gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Availability Settings</DialogTitle>
                  <DialogDescription>
                    Set your available hours for mentorship sessions
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="monday" className="text-right">
                      Monday
                    </Label>
                    <Input
                      id="monday"
                      defaultValue="9:00 AM - 5:00 PM"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tuesday" className="text-right">
                      Tuesday
                    </Label>
                    <Input
                      id="tuesday"
                      defaultValue="9:00 AM - 5:00 PM"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="wednesday" className="text-right">
                      Wednesday
                    </Label>
                    <Input
                      id="wednesday"
                      defaultValue="9:00 AM - 5:00 PM"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <Button className="w-full">Save Changes</Button>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Content
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Upload Video Lesson</DialogTitle>
                  <DialogDescription>
                    Add a new video lesson to your course content
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                    <Textarea
                      id="description"
                      placeholder="Enter lesson description"
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button className="w-full" disabled={!uploadedFile || uploadProgress < 100}>
                    Upload Lesson
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  1-on-1 Sessions
                </CardTitle>
                <CardDescription>Manage your mentorship and doubt sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upcoming" className="space-y-4 mt-6">
                    {mockSessions
                      .filter((s) => s.status === "upcoming")
                      .map((session) => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                  </TabsContent>
                  
                  <TabsContent value="pending" className="space-y-4 mt-6">
                    {mockSessions
                      .filter((s) => s.status === "pending")
                      .map((session) => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                  </TabsContent>
                  
                  <TabsContent value="past" className="space-y-4 mt-6">
                    {mockSessions
                      .filter((s) => s.status === "past")
                      .map((session) => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>View your scheduled sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    booked: mockSessions.map((s) => s.date),
                  }}
                  modifiersStyles={{
                    booked: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Today's Sessions</span>
                  <span className="text-2xl font-bold">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="text-2xl font-bold">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Students</span>
                  <span className="text-2xl font-bold">28</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}