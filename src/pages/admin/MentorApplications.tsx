import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Application = Database["public"]["Tables"]["mentor_applications"]["Row"];
type StatusFilter = "pending" | "approved" | "rejected";

/** Admin review of mentor applications. Decisions go through admin-checked RPCs. */
const MentorApplications = () => {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mentor_applications")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(100);
    if (error) toast({ title: "Could not load applications", variant: "destructive" });
    setApplications(data || []);
    setLoading(false);
  }, [status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id);
    const { error } = decision === "approve"
      ? await supabase.rpc("approve_mentor_application", { _application_id: id })
      : await supabase.rpc("reject_mentor_application", { _application_id: id });
    setBusyId(null);
    if (error) {
      toast({ title: `Could not ${decision} application`, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: decision === "approve" ? "Mentor approved" : "Application rejected" });
    load();
  };

  if (!isAdmin) {
    return <p className="text-muted-foreground">Only administrators can review mentor applications.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Mentor Applications</h1>
        <p className="text-muted-foreground">Approving an application grants mentor access and lists the mentor publicly.</p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No {status} applications.</p>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{app.full_name}</CardTitle>
                    <CardDescription>{app.email}{app.phone ? ` • ${app.phone}` : ""}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {app.is_volunteer && <Badge variant="outline">Volunteer</Badge>}
                    <Badge variant="secondary" className="capitalize">{app.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {app.expertise && app.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {app.expertise.map((e) => <Badge key={e} variant="secondary">{e}</Badge>)}
                  </div>
                )}
                {app.qualification && <p><span className="font-medium">Qualification:</span> {app.qualification}</p>}
                {app.experience_years !== null && <p><span className="font-medium">Experience:</span> {app.experience_years} years</p>}
                {app.motivation && <p className="whitespace-pre-wrap"><span className="font-medium">Motivation:</span> {app.motivation}</p>}
                <p className="text-xs text-muted-foreground">Submitted {new Date(app.created_at).toLocaleString()}</p>
                {app.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" disabled={busyId === app.id} onClick={() => decide(app.id, "approve")}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === app.id} onClick={() => decide(app.id, "reject")}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentorApplications;
