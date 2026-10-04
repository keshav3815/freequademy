import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users, Calendar } from "lucide-react";
import ForumSection from "@/components/community/ForumSection";
import ClubsSection from "@/components/community/ClubsSection";
import EventsSection from "@/components/community/EventsSection";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const Community = () => {
  const [activeTab, setActiveTab] = useState("forums");
  useDocumentMeta({ title: "Community", description: "Discussion forums, student clubs and live events on Freequademy." });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Community Support Hub
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with fellow students, join study groups, and participate in learning events
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="forums" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Discussion Forums</span>
              <span className="sm:hidden">Forums</span>
            </TabsTrigger>
            <TabsTrigger value="clubs" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Student Clubs</span>
              <span className="sm:hidden">Clubs</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Live Events</span>
              <span className="sm:hidden">Events</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forums" className="mt-0">
            <ForumSection />
          </TabsContent>

          <TabsContent value="clubs" className="mt-0">
            <ClubsSection />
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            <EventsSection />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Community;