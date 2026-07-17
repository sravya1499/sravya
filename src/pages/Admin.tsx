import { useEffect, useState } from "react";
import { Shield, Users, FolderKanban, Flag, Search, Check, X, Trash2, TrendingUp, TriangleAlert as AlertTriangle } from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  adminFetchProfiles, adminSetUserRole, adminFetchAllProjects, adminUpdateProjectStatus,
  fetchReports, updateReport,
} from "../lib/api";
import { Profile, Project, Report, STATUS_LABELS, AVAILABILITY_LABELS } from "../lib/types";
import { timeAgo, formatDate } from "../lib/utils";
import PageHeader from "../components/PageHeader";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";
import { useToast } from "../components/Toast";

type Tab = "overview" | "users" | "projects" | "reports";

export default function Admin() {
  const { profile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [reportFilter, setReportFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [u, p, r] = await Promise.all([adminFetchProfiles(200), adminFetchAllProjects(200), fetchReports()]);
        setUsers(u); setProjects(p); setReports(r);
      } finally { setLoading(false); }
    })();
  }, []);

  if (profile?.role !== "admin") {
    return <EmptyState icon={Shield} title="Admin access required" description="You don't have permission to view this page." />;
  }
  if (loading) return <InlineLoader label="Loading admin data…" />;

  const stats = {
    users: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    projects: projects.length,
    recruiting: projects.filter((p) => p.status === "recruiting").length,
    openReports: reports.filter((r) => r.status === "open").length,
  };

  const filteredUsers = users.filter((u) =>
    !userQuery || u.full_name.toLowerCase().includes(userQuery.toLowerCase()) || (u.username ?? "").includes(userQuery.toLowerCase()) || (u.university ?? "").toLowerCase().includes(userQuery.toLowerCase()),
  );
  const filteredReports = reports.filter((r) => reportFilter === "all" || r.status === reportFilter);

  const onRoleToggle = async (u: Profile) => {
    const newRole = u.role === "admin" ? "student" : "admin";
    try {
      await adminSetUserRole(u.id, newRole);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
      toast({ type: "success", message: `${u.full_name} is now ${newRole}` });
    } catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const onProjectStatus = async (id: string, status: string) => {
    try { await adminUpdateProjectStatus(id, status); setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: status as any } : p))); toast({ type: "success", message: "Project status updated" }); }
    catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const onResolveReport = async (id: string, status: "resolved" | "dismissed") => {
    try { await updateReport(id, status); setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r))); toast({ type: "success", message: `Report ${status}` }); }
    catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: TrendingUp },
    { key: "users", label: "Users", icon: Users, badge: users.length },
    { key: "projects", label: "Projects", icon: FolderKanban, badge: projects.length },
    { key: "reports", label: "Reports", icon: Flag, badge: stats.openReports || undefined },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin panel" subtitle="Manage users, projects, reports, and platform activity." />

      <div className="flex flex-wrap items-center gap-1 border-b border-ink-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.key ? "text-brand-700" : "text-ink-500 hover:text-ink-800"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
            {t.badge ? <span className="chip-neutral px-1.5 py-0 text-[10px]">{t.badge}</span> : null}
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStat icon={Users} label="Total users" value={stats.users} tone="brand" />
          <AdminStat icon={FolderKanban} label="Total projects" value={stats.projects} tone="accent" />
          <AdminStat icon={TrendingUp} label="Recruiting" value={stats.recruiting} tone="amber" />
          <AdminStat icon={AlertTriangle} label="Open reports" value={stats.openReports} tone="rose" />
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search users…" className="input pl-10" />
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/50 text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">University</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Availability</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.full_name} src={u.avatar_url} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink-900">{u.full_name}</div>
                          <div className="truncate text-xs text-ink-400">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-600 sm:table-cell">{u.university || "—"}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="chip-neutral capitalize">{AVAILABILITY_LABELS[u.availability]}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-500 lg:table-cell">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onRoleToggle(u)}
                        className={u.role === "admin" ? "chip-skill" : "chip-neutral hover:bg-ink-200"}
                      >
                        {u.role === "admin" ? "Admin" : "Student"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <div className="px-4 py-10 text-center text-sm text-ink-400">No users found.</div>}
          </div>
        </div>
      )}

      {tab === "projects" && (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/50 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Owner</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Created</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate font-semibold text-ink-900">{p.title}</div>
                    <div className="truncate text-xs text-ink-400">{p.description}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-600 sm:table-cell">{(p as any).creator?.full_name ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-ink-500 md:table-cell">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={p.status}
                      onChange={(e) => onProjectStatus(p.id, e.target.value)}
                      className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs focus:border-brand-400 focus:outline-none"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && <div className="px-4 py-10 text-center text-sm text-ink-400">No projects.</div>}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          <div className="flex gap-1">
            {["all", "open", "resolved", "dismissed"].map((f) => (
              <button key={f} onClick={() => setReportFilter(f)} className={`chip capitalize ${reportFilter === f ? "bg-brand-600 text-white border-brand-600" : "chip-neutral hover:bg-ink-200"}`}>{f}</button>
            ))}
          </div>
          {filteredReports.length === 0 ? (
            <EmptyState icon={Flag} title="No reports" description="User-submitted reports will appear here for moderation." />
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="chip-neutral capitalize">{r.target_type}</span>
                        <span className={r.status === "open" ? "chip-warn" : r.status === "resolved" ? "chip-success" : "chip-danger"}>{r.status}</span>
                        <span className="text-xs text-ink-400">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-ink-700">{r.reason}</p>
                      {r.reporter && (
                        <p className="mt-2 text-xs text-ink-400">Reported by {r.reporter.full_name}</p>
                      )}
                    </div>
                    {r.status === "open" && (
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => onResolveReport(r.id, "resolved")} className="btn-primary py-1.5 text-xs"><Check className="h-3.5 w-3.5" /> Resolve</button>
                        <button onClick={() => onResolveReport(r.id, "dismissed")} className="btn-secondary py-1.5 text-xs"><X className="h-3.5 w-3.5" /> Dismiss</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: string }) {
  const toneCls: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    accent: "bg-accent-50 text-accent-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${toneCls[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-display text-2xl font-bold text-ink-900">{value}</div>
      <div className="text-sm text-ink-500">{label}</div>
    </div>
  );
}
