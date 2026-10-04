import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { teacherApi, useTeacherMutation, useTeacherProfile } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { cn } from "@/lib/utils";
import { Avatar, ConfirmDialog, ErrorState, Field, PageHeader, Panel, SkeletonRows, TButton, inputClass, textareaClass } from "@/components/teacher/portal/ui";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function ProfileTab() {
  const { user, refresh } = useAuth();
  const profile = useTeacherProfile();
  const save = useTeacherMutation((input: Parameters<typeof teacherApi.saveTeacherProfile>[1], hasRow: boolean) => teacherApi.saveTeacherProfile(user!.id, input, hasRow), ["profile"]);
  const [form, setForm] = useState({ full_name: "", bio: "", expertise: "", qualification: "", experience_years: "" });

  useEffect(() => {
    if (!profile.data) return;
    const p = profile.data;
    setForm({ full_name: p.full_name, bio: p.bio, expertise: p.expertise.join(", "), qualification: p.qualification, experience_years: p.experience_years === null ? "" : String(p.experience_years) });
  }, [profile.data]);

  if (profile.isLoading) return <SkeletonRows rows={5} />;
  if (profile.isError || !profile.data) return <ErrorState message="We couldn't load your profile." onRetry={() => profile.refetch()} />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.full_name.trim().length < 2) return toast.error("Add your name.");
    const years = form.experience_years.trim() ? Math.max(0, Math.min(60, parseInt(form.experience_years) || 0)) : null;
    save.mutate(
      [
        {
          full_name: form.full_name,
          bio: form.bio,
          expertise: form.expertise.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12),
          qualification: form.qualification,
          experience_years: years,
        },
        profile.data!.has_mentor_row,
      ],
      {
        onSuccess: async () => {
          await refresh();
          toast.success("Profile saved");
        },
        onError: (err) => toast.error("Could not save profile", { description: err.message }),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={form.full_name} size={56} />
        <p className="text-[13px] text-muted-foreground">Your initials are shown as your avatar across Freequademy.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="s-name">
          <input id="s-name" className={inputClass} value={form.full_name} maxLength={100} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Qualification" htmlFor="s-qual">
          <input id="s-qual" className={inputClass} value={form.qualification} maxLength={200} disabled={!profile.data.has_mentor_row} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="M.Sc. Mathematics, B.Ed." />
        </Field>
      </div>
      <Field label="Bio" htmlFor="s-bio" hint="Shown on your public mentor profile.">
        <textarea id="s-bio" className={textareaClass} value={form.bio} maxLength={2000} disabled={!profile.data.has_mentor_row} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subjects" htmlFor="s-subjects" hint="Comma separated.">
          <input id="s-subjects" className={inputClass} value={form.expertise} disabled={!profile.data.has_mentor_row} onChange={(e) => setForm({ ...form, expertise: e.target.value })} placeholder="Mathematics, Physics" />
        </Field>
        <Field label="Years of experience" htmlFor="s-years">
          <input id="s-years" type="number" min={0} max={60} className={inputClass} value={form.experience_years} disabled={!profile.data.has_mentor_row} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
        </Field>
      </div>
      {!profile.data.has_mentor_row && <p className="text-[13px] text-muted-foreground">Teaching details are available once your mentor application is approved.</p>}
      <div className="flex justify-end">
        <TButton type="submit" loading={save.isPending}>
          Save profile
        </TButton>
      </div>
    </form>
  );
}

function AccountTab() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-5">
      <Field label="Email" htmlFor="s-email" hint="Contact support to change the email on your account.">
        <input id="s-email" className={cn(inputClass, "bg-muted")} value={user?.email ?? ""} readOnly />
      </Field>
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-medium">Password</p>
          <p className="text-[13px] text-muted-foreground">We'll email you a secure link to set a new password.</p>
        </div>
        <TButton
          variant="secondary"
          loading={pending}
          onClick={async () => {
            if (!user?.email) return;
            setPending(true);
            try {
              await teacherApi.sendPasswordReset(user.email);
              toast.success("Check your inbox", { description: `We sent a reset link to ${user.email}.` });
            } catch (e) {
              toast.error("Could not send the link", { description: (e as Error).message });
            } finally {
              setPending(false);
            }
          }}
        >
          Send reset link
        </TButton>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const shortcuts = [
    ["Ctrl K  or  /", "Search the portal"],
    ["J / K", "Next / previous student while reviewing submissions"],
    ["Ctrl Enter", "Send feedback or a reply"],
  ];
  return (
    <div className="space-y-4">
      <p className="text-[14px] text-muted-foreground">The sidebar remembers whether you collapsed it, on this device. Use the button at the top of the sidebar to switch.</p>
      <div>
        <h3 className="mb-2 text-[14px] font-semibold">Keyboard shortcuts</h3>
        <dl className="divide-y divide-border rounded-lg border border-border">
          {shortcuts.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5 text-[14px]">
              <dt className="text-muted-foreground">{v}</dt>
              <dd>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[12px]">{k}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function SecurityTab() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[14px] font-medium">Sign out everywhere</p>
        <p className="text-[13px] text-muted-foreground">Ends your sessions on every device, including this one.</p>
      </div>
      <TButton variant="secondary" onClick={() => setConfirm(true)}>
        Sign out all devices
      </TButton>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Sign out of all devices?"
        description="You'll need to sign in again everywhere."
        confirmLabel="Sign out everywhere"
        destructive
        pending={pending}
        onConfirm={async () => {
          setPending(true);
          try {
            await teacherApi.signOutEverywhere();
            navigate("/login");
          } catch (e) {
            toast.error("Could not sign out", { description: (e as Error).message });
            setPending(false);
          }
        }}
      />
    </div>
  );
}

export default function SettingsPage() {
  useDocumentMeta({ title: "Settings" });
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "profile") as Tab;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" description="Your profile and account." />
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <nav aria-label="Settings sections">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {TABS.map((t) => (
              <li key={t.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setParams({ tab: t.id }, { replace: true })}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cn("tp-focus w-full rounded-md px-3 py-1.5 text-left text-[14px] transition-colors", tab === t.id ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <Panel title={TABS.find((t) => t.id === tab)!.label}>
          {tab === "profile" && <ProfileTab />}
          {tab === "account" && <AccountTab />}
          {tab === "preferences" && <PreferencesTab />}
          {tab === "security" && <SecurityTab />}
        </Panel>
      </div>
    </div>
  );
}
