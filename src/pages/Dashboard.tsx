import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import StudentLayout from "@/components/dashboard/StudentLayout";
import { Card } from "@/components/ui/card";
import { Flame, Star, Zap, Loader2, Calendar, ClipboardCheck, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentDashboard } from "@/hooks/useStudentDashboard";
import { buildRecommendations } from "@/lib/recommendations";
import DashboardSection from "@/components/dashboard/DashboardSection";

// Dashboard sections
import AcademicProfileCard from "@/components/dashboard/AcademicProfileCard";
import OverallProgressCard from "@/components/dashboard/OverallProgressCard";
import MyLearningSection from "@/components/dashboard/MyLearningSection";
import ContinueLearningWidget from "@/components/dashboard/ContinueLearningWidget";
import SubjectPerformanceChart from "@/components/dashboard/charts/SubjectPerformanceChart";
import WeakAreasCard from "@/components/dashboard/WeakAreasCard";
import TestAnalyticsSection from "@/components/dashboard/TestAnalyticsSection";
import LearningActivityHeatmap from "@/components/dashboard/LearningActivityHeatmap";
import WeeklySummaryCard from "@/components/dashboard/WeeklySummaryCard";
import XpStreakCard from "@/components/dashboard/XpStreakCard";
import DoubtAnalyticsCard from "@/components/dashboard/DoubtAnalyticsCard";
import MentorshipAnalyticsCard from "@/components/dashboard/MentorshipAnalyticsCard";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";
import DoubtSolver from "@/components/dashboard/DoubtSolver";
import RecommendationsCard from "@/components/dashboard/RecommendationsCard";
import TeacherAnnouncementsCard from "@/components/dashboard/TeacherAnnouncementsCard";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

export default function Dashboard() {
  const { profile, role, loading: authLoading } = useAuth();
  const hasGrade = !!profile?.grade && GRADES.includes(profile.grade);
  const currentGrade = hasGrade ? profile!.grade! : "10";
  const userName = (profile?.full_name || "Student").split(" ")[0];

  const d = useStudentDashboard(currentGrade);

  const recommendations = useMemo(
    () =>
      buildRecommendations({
        weakAreas: d.weakAreas.data,
        subjects: d.subjects.data,
        doubtStats: d.doubtStats.data,
      }),
    [d.weakAreas.data, d.subjects.data, d.doubtStats.data],
  );

  const subjectChartData = useMemo(
    () =>
      (d.subjects.data ?? []).map((s) => ({
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        completion_pct: s.lesson_count > 0 ? Math.round((s.lessons_completed / s.lesson_count) * 100) : 0,
        average_score: s.average_score === null ? null : Number(s.average_score),
      })),
    [d.subjects.data],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Teachers have their own workspace; the student dashboard has nothing for them.
  if (role === "mentor") return <Navigate to="/teacher" replace />;

  return (
    <StudentLayout>
      <div className="py-6 md:py-10">
        <div className="container mx-auto px-4 space-y-8">
          {/* ---------- Header ---------- */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Welcome back, <span className="bg-gradient-primary bg-clip-text text-transparent">{userName}!</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {hasGrade ? `Class ${currentGrade} Dashboard` : "Class not set"}
            </p>
            {!hasGrade && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing Class 10 as a default. <Link to="/courses" className="text-primary underline">Browse all classes</Link>.
              </p>
            )}
          </div>

          <TeacherAnnouncementsCard />

          {/* ---------- KPI row ---------- */}
          <DashboardSection query={d.summary} title="your summary" minHeight={92}>
            {(summary) => {
              const testAvg = summary?.average_score !== null && summary?.average_score !== undefined ? Number(summary.average_score) : null;
              const overallCompletionPct = subjectChartData.length
                ? Math.round(subjectChartData.reduce((s, x) => s + x.completion_pct, 0) / subjectChartData.length)
                : 0;
              const completedCourses = (d.subjects.data ?? []).filter((s) => s.status === "completed").length;
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card
                    className="p-4"
                    role="group"
                    aria-label={`Current level: Level ${summary?.level ?? 1}, ${(summary?.xp_for_next_level ?? 250) - (summary?.xp_into_level ?? 0)} XP to next level`}
                  >
                    <div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Current Level</span></div>
                    <p className="text-2xl font-bold" aria-hidden="true">Level {summary?.level ?? 1}</p>
                    <p className="text-xs text-muted-foreground" aria-hidden="true">+{(summary?.xp_for_next_level ?? 250) - (summary?.xp_into_level ?? 0)} XP to next</p>
                  </Card>
                  <Card
                    className="p-4"
                    role="group"
                    aria-label={`XP earned: ${summary?.total_xp ?? 0} total, ${summary?.xp_this_week ?? 0} this week`}
                  >
                    <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-yellow-600" /><span className="text-xs text-muted-foreground">XP Earned</span></div>
                    <p className="text-2xl font-bold" aria-hidden="true">{summary?.total_xp ?? 0}</p>
                    <p className="text-xs text-muted-foreground" aria-hidden="true">+{summary?.xp_this_week ?? 0} this week</p>
                  </Card>
                  <Card
                    className="p-4"
                    role="group"
                    aria-label={`Course progress: ${overallCompletionPct}%, ${completedCourses} of ${subjectChartData.length} courses completed`}
                  >
                    <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Course Progress</span></div>
                    <p className="text-2xl font-bold" aria-hidden="true">{overallCompletionPct}%</p>
                    <p className="text-xs text-muted-foreground" aria-hidden="true">{completedCourses}/{subjectChartData.length} courses</p>
                  </Card>
                  <Card
                    className="p-4"
                    role="group"
                    aria-label={`Test average: ${testAvg === null ? "no tests taken yet" : `${testAvg}%`}, ${summary?.tests_submitted ?? 0} tests taken`}
                  >
                    <div className="flex items-center gap-2 mb-1"><ClipboardCheck className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Test Average</span></div>
                    <p className="text-2xl font-bold" aria-hidden="true">{testAvg === null ? "—" : `${testAvg}%`}</p>
                    <p className="text-xs text-muted-foreground" aria-hidden="true">{summary?.tests_submitted ?? 0} tests taken</p>
                  </Card>
                  <Card
                    className="p-4"
                    role="group"
                    aria-label={`Learning streak: ${summary?.streak_days ?? 0} day${summary?.streak_days === 1 ? "" : "s"}, best ${summary?.best_streak_days ?? 0} days`}
                  >
                    <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4 text-orange-600" /><span className="text-xs text-muted-foreground">Learning Streak</span></div>
                    <p className="text-2xl font-bold" aria-hidden="true">{summary?.streak_days ?? 0} day{summary?.streak_days === 1 ? "" : "s"}</p>
                    <p className="text-xs text-muted-foreground" aria-hidden="true">Best: {summary?.best_streak_days ?? 0} days</p>
                  </Card>
                </div>
              );
            }}
          </DashboardSection>

          {/* ---------- Academic profile + overall progress ---------- */}
          <div className="grid lg:grid-cols-2 gap-6">
            <DashboardSection query={d.subjects} title="your academic profile" minHeight={200}>
              {(subjects) => <AcademicProfileCard grade={hasGrade ? currentGrade : null} subjects={subjects} />}
            </DashboardSection>
            <DashboardSection query={d.summary} title="your overall progress" minHeight={200}>
              {(summary) => (
                <OverallProgressCard
                  subjects={(d.subjects.data ?? []).map((s) => ({ status: s.status, lesson_count: s.lesson_count, lessons_completed: s.lessons_completed }))}
                  testsAttempted={summary?.tests_submitted ?? 0}
                  testsPublished={(d.subjects.data ?? []).reduce((sum, s) => sum + s.test_count, 0)}
                  activeDaysLast30={summary?.active_days_last_30 ?? 0}
                />
              )}
            </DashboardSection>
          </div>

          {/* ---------- My Learning ---------- */}
          <DashboardSection query={d.subjects} title="your courses" minHeight={220}>
            {(subjects) => <MyLearningSection subjects={subjects} grade={currentGrade} />}
          </DashboardSection>

          {/* ---------- Continue / Subject performance / Weak areas ---------- */}
          <div className="grid lg:grid-cols-3 gap-6">
            <DashboardSection query={d.continueLesson} title="continue learning" minHeight={200}>
              {(lesson) => <ContinueLearningWidget lesson={lesson} grade={currentGrade} />}
            </DashboardSection>
            <Card className="p-5 lg:col-span-1">
              <h3 className="font-semibold mb-4">Subject Performance</h3>
              <DashboardSection query={d.subjects} title="subject performance" minHeight={160}>
                {() => <SubjectPerformanceChart data={subjectChartData} />}
              </DashboardSection>
            </Card>
            <DashboardSection query={d.weakAreas} title="areas needing attention" minHeight={200}>
              {(areas) => <WeakAreasCard areas={areas} />}
            </DashboardSection>
          </div>

          {/* ---------- Test performance ---------- */}
          <DashboardSection query={d.recentTests} title="test performance" minHeight={300}>
            {(results) => <TestAnalyticsSection results={results} />}
          </DashboardSection>

          {/* ---------- Activity + weekly summary ---------- */}
          <div className="grid lg:grid-cols-2 gap-6">
            <DashboardSection query={d.activityDays} title="learning activity" minHeight={220}>
              {(days) => <LearningActivityHeatmap days={days} />}
            </DashboardSection>
            <DashboardSection query={d.weeklySummary} title="this week's summary" minHeight={220}>
              {({ thisWeek, lastWeek }) => <WeeklySummaryCard thisWeek={thisWeek} lastWeek={lastWeek} />}
            </DashboardSection>
          </div>

          {/* ---------- XP/streak, doubts, mentorship, upcoming ---------- */}
          <div className="grid lg:grid-cols-2 gap-6">
            <DashboardSection query={d.summary} title="XP and streak" minHeight={260}>
              {(summary) => (
                <DashboardSection query={d.xpBreakdown} title="XP breakdown" minHeight={260}>
                  {(breakdown) => (
                    <XpStreakCard
                      breakdown={breakdown}
                      streakDays={summary?.streak_days ?? 0}
                      bestStreakDays={summary?.best_streak_days ?? 0}
                      activeDaysThisWeek={summary?.active_days_this_week ?? 0}
                    />
                  )}
                </DashboardSection>
              )}
            </DashboardSection>
            <DashboardSection query={d.doubtStats} title="doubt analytics" minHeight={260}>
              {(stats) => <DoubtAnalyticsCard stats={stats} recent={d.recentDoubts.data ?? []} />}
            </DashboardSection>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <DashboardSection query={d.mentorship} title="mentorship" minHeight={220}>
              {(summary) => <MentorshipAnalyticsCard summary={summary} />}
            </DashboardSection>
            <UpcomingSchedule grade={currentGrade} />
          </div>

          {/* ---------- AI doubt solver (preserved) ---------- */}
          <DoubtSolver grade={currentGrade} />

          {/* ---------- Recommendations ---------- */}
          <RecommendationsCard recommendations={recommendations} />
        </div>
      </div>
    </StudentLayout>
  );
}
