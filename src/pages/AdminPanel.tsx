import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ContentManagement from "@/pages/admin/ContentManagement";
import UserActivity from "@/pages/admin/UserActivity";
import ReportManagement from "@/pages/admin/ReportManagement";
import { useUserRole } from "@/hooks/useUserRole";

const AdminPanel = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/content" element={<ContentManagement />} />
        <Route path="/activity" element={role === "admin" ? <UserActivity /> : <Navigate to="/admin" replace />} />
        <Route path="/reports" element={<ReportManagement />} />
      </Routes>
    </DashboardLayout>
  );
};

export default AdminPanel;
