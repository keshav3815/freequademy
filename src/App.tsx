import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import MockTests from "./pages/MockTests";
import Dashboard from "./pages/Dashboard";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import TeacherDashboard from "./pages/TeacherDashboard";
import SignupStudent from "./pages/SignupStudent";
import SignupMentor from "./pages/SignupMentor";
import Mentorship from "./pages/Mentorship";
import MentorApplication from "./pages/MentorApplication";
import MentorDashboard from "./pages/MentorDashboard";
import Community from "./pages/Community";

import AdminPanel from "./pages/AdminPanel";
import GuessNumberGame from "./pages/GuessNumberGame";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import BlogAdmin from "./pages/BlogAdmin";
import BlogEdit from "./pages/BlogEdit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/tests" element={<MockTests />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/signup-student" element={<SignupStudent />} />
          <Route path="/signup-mentor" element={<SignupMentor />} />
          <Route path="/mentorship" element={<Mentorship />} />
          <Route path="/mentor-application" element={<MentorApplication />} />
          <Route path="/mentor-dashboard" element={<MentorDashboard />} />
          <Route path="/community" element={<Community />} />
          
          <Route path="/admin/*" element={<AdminPanel />} />
          <Route path="/game/guess-number" element={<GuessNumberGame />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/create" element={<BlogAdmin />} />
          <Route path="/blog/edit/:id" element={<BlogEdit />} />
          <Route path="/blog/:postId" element={<BlogPost />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
