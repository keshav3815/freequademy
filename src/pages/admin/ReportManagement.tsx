import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Report = Tables<"user_reports">;

const ReportManagement = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateReportStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("user_reports")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Report ${status}`,
      });
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Error",
        description: "Failed to update report",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      resolved: "default",
      pending: "secondary",
      dismissed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Report Management</h1>
        <p className="text-muted-foreground">Review and handle user-submitted reports</p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reports to review</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover-lift">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Report from {report.reporter_name}
                    </CardTitle>
                    <CardDescription>
                      {report.created_at && `Submitted on ${new Date(report.created_at).toLocaleDateString()}`}
                    </CardDescription>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Reason</h4>
                  <p className="text-foreground">{report.reason}</p>
                </div>
                
                {report.content_link && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                      Content Link
                    </h4>
                    <a
                      href={report.content_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View reported content
                    </a>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateReportStatus(report.id, "dismissed")}
                    disabled={report.status === "dismissed"}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Dismiss Report
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateReportStatus(report.id, "resolved")}
                    disabled={report.status === "resolved"}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Warn User
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateReportStatus(report.id, "resolved")}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
