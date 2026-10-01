import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";
import { LEARNING_MODULE_LIST } from "./lib/learningModules";

const WORKSPACE_TEST_PATHS = ["", "/:subjectSlug", "/:subjectSlug/:chapterId"];
const WORKSPACE_LESSON_PATHS = [...WORKSPACE_TEST_PATHS, "/:subjectSlug/:chapterId/:itemId"];
const Courses = lazy(() => import("./pages/Courses"));
const MockTests = lazy(() => import("./pages/MockTests"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignupStudent = lazy(() => import("./pages/SignupStudent"));
const SignupMentor = lazy(() => import("./pages/SignupMentor"));
const Mentorship = lazy(() => import("./pages/Mentorship"));
const MentorApplication = lazy(() => import("./pages/MentorApplication"));
const MentorDashboard = lazy(() => import("./pages/MentorDashboard"));
const Community = lazy(() => import("./pages/Community"));

const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const GuessNumberGame = lazy(() => import("./pages/GuessNumberGame"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BlogAdmin = lazy(() => import("./pages/BlogAdmin"));
const BlogEdit = lazy(() => import("./pages/BlogEdit"));
const NewThread = lazy(() => import("./pages/community/NewThread"));
const ThreadDetail = lazy(() => import("./pages/community/ThreadDetail"));
const CreateClub = lazy(() => import("./pages/community/CreateClub"));
const ClubDetail = lazy(() => import("./pages/community/ClubDetail"));
const CreateEvent = lazy(() => import("./pages/community/CreateEvent"));
const SubjectDetail = lazy(() => import("./pages/learn/SubjectDetail"));
const LessonView = lazy(() => import("./pages/learn/LessonView"));
const TakeTest = lazy(() => import("./pages/learn/TakeTest"));
const AttemptReview = lazy(() => import("./pages/learn/AttemptReview"));
const LearningWorkspace = lazy(() => import("./pages/learn/LearningWorkspace"));
const StudyNotesPage = lazy(() => import("./pages/learn/StudyNotesPage"));
const StudyNoteReaderPage = lazy(() => import("./pages/learn/StudyNoteReaderPage"));
const TeacherLayout = lazy(() => import("./components/teacher/portal/TeacherLayout"));
const TeacherHome = lazy(() => import("./pages/teacher/TeacherHome"));
const TeacherCourses = lazy(() => import("./pages/teacher/CoursesPage"));
const TeacherCourseNew = lazy(() => import("./pages/teacher/CourseNewPage"));
const TeacherCourseDetail = lazy(() => import("./pages/teacher/CourseDetailPage"));
const TeacherLessonEditor = lazy(() => import("./pages/teacher/LessonEditorPage"));
const TeacherClasses = lazy(() => import("./pages/teacher/ClassesPage"));
const TeacherAssignments = lazy(() => import("./pages/teacher/AssignmentsPage"));
const TeacherAssignmentEditor = lazy(() => import("./pages/teacher/AssignmentEditorPage"));
const TeacherSubmissions = lazy(() => import("./pages/teacher/SubmissionReviewPage"));
const TeacherCalendar = lazy(() => import("./pages/teacher/CalendarPage"));
const TeacherStudents = lazy(() => import("./pages/teacher/StudentsPage"));
const TeacherStudentProfile = lazy(() => import("./pages/teacher/StudentProfilePage"));
const TeacherAttention = lazy(() => import("./pages/teacher/AttentionPage"));
const TeacherAttendance = lazy(() => import("./pages/teacher/AttendancePage"));
const TeacherAnalytics = lazy(() => import("./pages/teacher/AnalyticsPage"));
const TeacherPerformance = lazy(() => import("./pages/teacher/PerformancePage"));
const TeacherResources = lazy(() => import("./pages/teacher/ResourcesPage"));
const TeacherMessages = lazy(() => import("./pages/teacher/MessagesPage"));
const TeacherAnnouncements = lazy(() => import("./pages/teacher/AnnouncementsPage"));
const TeacherBlog = lazy(() => import("./pages/teacher/BlogPage"));
const TeacherSettings = lazy(() => import("./pages/teacher/SettingsPage"));
const MyDoubts = lazy(() => import("./pages/MyDoubts"));
const About = lazy(() => import("./pages/About"));
const Help = lazy(() => import("./pages/Help"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Old authoring URLs (/teach/…) now live in the teacher portal. */
const LegacyTeachRedirect = ({ kind }: { kind: "lesson" | "test" }) => {
  const { id } = useParams();
  const { search } = useLocation();
  const base = kind === "lesson" ? "/teacher/lessons" : "/teacher/assignments";
  return <Navigate to={`${base}/${id ? `${id}/edit` : "new"}${search}`} replace />;
};

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/tests" element={<MockTests />} />
            <Route path="/doubts" element={<RequireAuth><MyDoubts /></RequireAuth>} />
            <Route path="/courses/:subjectId" element={<SubjectDetail />} />
            <Route path="/lessons/:lessonId" element={<LessonView />} />
            <Route path="/tests/:testId" element={<RequireAuth><TakeTest /></RequireAuth>} />
            <Route path="/tests/:testId/attempts/:attemptId" element={<RequireAuth><AttemptReview /></RequireAuth>} />
            <Route path="/teach/lessons/new" element={<LegacyTeachRedirect kind="lesson" />} />
            <Route path="/teach/lessons/:id/edit" element={<LegacyTeachRedirect kind="lesson" />} />
            <Route path="/teach/tests/new" element={<LegacyTeachRedirect kind="test" />} />
            <Route path="/teach/tests/:id/edit" element={<LegacyTeachRedirect kind="test" />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            {WORKSPACE_TEST_PATHS.map((suffix) => (
              <Route key={`notes${suffix}`} path={`/study-notes${suffix}`} element={<RequireAuth><StudyNotesPage /></RequireAuth>} />
            ))}
            <Route path="/study-notes/:subjectSlug/:chapterId/:itemId" element={<RequireAuth><StudyNoteReaderPage /></RequireAuth>} />
            {LEARNING_MODULE_LIST.filter((m) => m.id !== "notes").flatMap((m) =>
              (m.kind === "lesson" ? WORKSPACE_LESSON_PATHS : WORKSPACE_TEST_PATHS).map((suffix) => (
                <Route
                  key={`${m.id}${suffix}`}
                  path={`${m.basePath}${suffix}`}
                  element={<RequireAuth><LearningWorkspace key={m.id} moduleId={m.id} /></RequireAuth>}
                />
              )),
            )}
            <Route path="/teacher-dashboard" element={<Navigate to="/teacher" replace />} />
            {/* Teacher portal: one persistent layout; RLS + teacher RPCs enforce data access. */}
            <Route path="/teacher" element={<RequireAuth allow={["mentor", "admin"]}><TeacherLayout /></RequireAuth>}>
              <Route index element={<TeacherHome />} />
              <Route path="courses" element={<TeacherCourses />} />
              <Route path="courses/new" element={<TeacherCourseNew />} />
              <Route path="courses/:courseId" element={<TeacherCourseDetail />} />
              <Route path="courses/:courseId/:tab" element={<TeacherCourseDetail />} />
              <Route path="lessons/new" element={<TeacherLessonEditor />} />
              <Route path="lessons/:id/edit" element={<TeacherLessonEditor />} />
              <Route path="classes" element={<TeacherClasses />} />
              <Route path="assignments" element={<TeacherAssignments />} />
              <Route path="assignments/new" element={<TeacherAssignmentEditor />} />
              <Route path="assignments/:assignmentId" element={<TeacherSubmissions />} />
              <Route path="assignments/:assignmentId/edit" element={<TeacherAssignmentEditor />} />
              <Route path="assignments/:assignmentId/submissions" element={<TeacherSubmissions />} />
              <Route path="calendar" element={<TeacherCalendar />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="students/attention" element={<TeacherAttention />} />
              <Route path="students/:studentId" element={<TeacherStudentProfile />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="analytics" element={<TeacherAnalytics />} />
              <Route path="performance" element={<TeacherPerformance />} />
              <Route path="resources" element={<TeacherResources />} />
              <Route path="messages" element={<TeacherMessages />} />
              <Route path="announcements" element={<TeacherAnnouncements />} />
              <Route path="blog" element={<TeacherBlog />} />
              <Route path="settings" element={<TeacherSettings />} />
              <Route path="*" element={<Navigate to="/teacher" replace />} />
            </Route>
          
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          
            <Route path="/signup-student" element={<SignupStudent />} />
            <Route path="/signup-mentor" element={<SignupMentor />} />
            <Route path="/mentorship" element={<Mentorship />} />
            <Route path="/mentor-application" element={<RequireAuth><MentorApplication /></RequireAuth>} />
            <Route path="/mentor-dashboard" element={<RequireAuth allow={["mentor", "admin"]}><MentorDashboard /></RequireAuth>} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/new-thread" element={<RequireAuth><NewThread /></RequireAuth>} />
            <Route path="/community/thread/:id" element={<ThreadDetail />} />
            <Route path="/community/create-club" element={<RequireAuth><CreateClub /></RequireAuth>} />
            <Route path="/community/club/:id" element={<ClubDetail />} />
            <Route path="/community/create-event" element={<RequireAuth allow={["mentor", "admin"]}><CreateEvent /></RequireAuth>} />
          
            <Route path="/admin/*" element={<RequireAuth allow={["admin", "moderator"]}><AdminPanel /></RequireAuth>} />
            <Route path="/game/guess-number" element={<GuessNumberGame />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/create" element={<RequireAuth allow={["mentor", "admin"]}><BlogAdmin /></RequireAuth>} />
            <Route path="/blog/edit/:id" element={<RequireAuth allow={["mentor", "admin"]}><BlogEdit /></RequireAuth>} />
            <Route path="/blog/:postId" element={<BlogPost />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </AuthProvider>
      </BrowserRouter>
  </QueryClientProvider>
);

export default App;
