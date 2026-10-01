import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Operational dashboard (Architecture V1 Phase 5): queue health, client
 * errors, real-user performance and the audit trail, all from our own
 * database. Every query is admin-only server-side (RLS / is_admin checks).
 */
const SystemHealth = () => {
  const jobs = useQuery({
    queryKey: ["admin", "job-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_job_health");
      if (error) throw error;
      return data ?? [];
    },
  });
  const errors = useQuery({
    queryKey: ["admin", "client-errors"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_error_summary", { _days: 7 });
      if (error) throw error;
      return data ?? [];
    },
  });
  const vitals = useQuery({
    queryKey: ["admin", "web-vitals"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_web_vitals_summary", { _days: 7, _environment: "production" });
      if (error) throw error;
      return data ?? [];
    },
  });
  const audit = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, actor_role, action, resource_type, resource_id, changed_fields, request_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const dead = (jobs.data ?? []).filter((j) => j.status === "dead").reduce((n, j) => n + Number(j.jobs), 0);
  const dashboardLcp = (vitals.data ?? []).find((v) => v.metric === "LCP" && v.route === "/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System health</h1>
        <p className="text-muted-foreground">Background jobs, client errors, real-user performance and the audit trail.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Dead-lettered jobs" value={jobs.isLoading ? "…" : String(dead)} alert={dead > 0} />
        <Stat title="Error groups (7 days)" value={errors.isLoading ? "…" : String(errors.data?.length ?? 0)} />
        <Stat
          title="Dashboard LCP p75 (production)"
          value={dashboardLcp ? `${Math.round(dashboardLcp.p75)} ms` : "No data yet"}
          alert={!!dashboardLcp && dashboardLcp.p75 > 2500}
        />
      </div>

      <Section title="Background jobs" description="Queued, retrying and dead-lettered jobs by type." loading={jobs.isLoading} error={jobs.isError}
        empty={(jobs.data ?? []).length === 0} emptyText="No pending, retrying or failed jobs.">
        <Table>
          <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Type</TableHead><TableHead>Jobs</TableHead><TableHead>Oldest scheduled</TableHead><TableHead>Last error</TableHead></TableRow></TableHeader>
          <TableBody>
            {(jobs.data ?? []).map((j) => (
              <TableRow key={`${j.status}-${j.type}`}>
                <TableCell><Badge variant={j.status === "dead" ? "destructive" : "secondary"}>{j.status}</Badge></TableCell>
                <TableCell>{j.type}</TableCell>
                <TableCell>{j.jobs}</TableCell>
                <TableCell>{j.oldest_scheduled_at ? new Date(j.oldest_scheduled_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{j.last_error ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Client errors" description="Grouped by type, message and route over the last 7 days (scrubbed of personal data)." loading={errors.isLoading}
        error={errors.isError} empty={(errors.data ?? []).length === 0} emptyText="No client errors reported.">
        <Table>
          <TableHeader><TableRow><TableHead>Env</TableHead><TableHead>Error</TableHead><TableHead>Route</TableHead><TableHead>Count</TableHead><TableHead>Last seen</TableHead></TableRow></TableHeader>
          <TableBody>
            {(errors.data ?? []).map((e, i) => (
              <TableRow key={i}>
                <TableCell>{e.environment}</TableCell>
                <TableCell className="max-w-md"><span className="font-medium">{e.error_type}</span> {e.message}</TableCell>
                <TableCell>{e.route}</TableCell>
                <TableCell>{e.occurrences}</TableCell>
                <TableCell>{new Date(e.last_seen).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Real-user performance (production)" description="Core Web Vitals from sampled real visits, last 7 days." loading={vitals.isLoading}
        error={vitals.isError} empty={(vitals.data ?? []).length === 0} emptyText="No samples yet.">
        <Table>
          <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Route</TableHead><TableHead>Samples</TableHead><TableHead>p50</TableHead><TableHead>p75</TableHead><TableHead>p95</TableHead></TableRow></TableHeader>
          <TableBody>
            {(vitals.data ?? []).map((v) => (
              <TableRow key={`${v.metric}-${v.route}`}>
                <TableCell>{v.metric}</TableCell>
                <TableCell>{v.route}</TableCell>
                <TableCell>{v.samples}</TableCell>
                <TableCell>{fmt(v.metric, v.p50)}</TableCell>
                <TableCell>{fmt(v.metric, v.p75)}</TableCell>
                <TableCell>{fmt(v.metric, v.p95)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Audit log" description="Most recent 50 sensitive actions." loading={audit.isLoading} error={audit.isError}
        empty={(audit.data ?? []).length === 0} emptyText="No audited actions yet.">
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Changed</TableHead><TableHead>Request</TableHead></TableRow></TableHeader>
          <TableBody>
            {(audit.data ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                <TableCell>{a.actor_role}</TableCell>
                <TableCell>{a.action}</TableCell>
                <TableCell>{a.resource_type}{a.resource_id ? ` · ${a.resource_id.slice(0, 8)}` : ""}</TableCell>
                <TableCell>{a.changed_fields?.join(", ") ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{a.request_id?.slice(0, 8) ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  );
};

function fmt(metric: string, value: number) {
  return metric === "CLS" ? value.toFixed(3) : `${Math.round(value)} ms`;
}

function Stat({ title, value, alert = false }: { title: string; value: string; alert?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{title}</CardDescription></CardHeader>
      <CardContent><p className={`text-2xl font-bold ${alert ? "text-destructive" : ""}`}>{value}</p></CardContent>
    </Card>
  );
}

function Section(props: { title: string; description: string; loading: boolean; error: boolean; empty: boolean; emptyText: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {props.loading ? <p className="text-sm text-muted-foreground">Loading…</p>
          : props.error ? <p className="text-sm text-destructive">Could not load this section.</p>
          : props.empty ? <p className="text-sm text-muted-foreground">{props.emptyText}</p>
          : props.children}
      </CardContent>
    </Card>
  );
}

export default SystemHealth;
