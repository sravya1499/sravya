import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban, Inbox, Users, TrendingUp, ArrowRight, Clock,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  fetchProjects, fetchMyRequests, fetchNotifications,
} from "../lib/api";
import { Project, JoinRequest, Notification } from "../lib/types";
import { STATUS_LABELS, AVAILABILITY_LABELS } from "../lib/types";
import { deadlineLabel, timeAgo } from "../lib/utils";
import PageHeader from "../components/PageHeader";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";

export default function Dashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recommended, setRecommended] = useState<Project[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      try {
        const [mine, all, reqs, ns] = await Promise.all([
          fetchProjects({ limit: 100 }),
          fetchProjects({ status: "recruiting", limit: 6 }),
          fetchMyRequests(profile.id),
          fetchNotifications(profile.id),
        ]);
        const myProjects = mine.filter(
          (p) => p.members?.some((m) => m.user_id === profile.id) || p.created_by === profile.id,
        );
        setProjects(myProjects);
        const myProjectIds = new Set(myProjects.map((p) => p.id));
        setRecommended(all.filter((p) => !myProjectIds.has(p.id) && p.created_by !== profile.id).slice(0, 3));
        setRequests(reqs.filter((r) => r.status === "pending"));
        setNotifs(ns.slice(0, 6));
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (loading) return <InlineLoader label="Loading your dashboard…" />;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting}, ${profile?.full_name?.split(" ")[0] || "there"} 👋`}
        subtitle="Here's what's happening across your projects today."
        action={
          <Link to="/app/explore" className="btn-primary">
            <TrendingUp className="h-4 w-4" />
            Explore projects
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FolderKanban} label="Active projects" value={projects.length} tone="brand" />
        <StatCard icon={Inbox} label="Pending requests" value={requests.length} tone="amber" />
        <StatCard icon={Users} label="Available teammates" value="—" tone="accent" hint="Explore to find" />
        <StatCard icon={Clock} label="Unread notifications" value={notifs.filter((n) => !n.read).length} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My projects */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Your projects</h2>
            <Link to="/app/projects" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Post your first project idea or join an existing team to get started."
              action={<Link to="/app/explore" className="btn-primary">Find a project</Link>}
            />
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map((p) => (
                <Link key={p.id} to={`/app/team/${p.id}`} className="card-hover block p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-ink-900">{p.title}</h3>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-ink-500">{p.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.members?.length ?? 0}/{p.team_size}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {deadlineLabel(p.deadline)}</span>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">Recommended</h2>
            </div>
            {recommended.length === 0 ? (
              <div className="card p-4 text-sm text-ink-400">No recommendations right now.</div>
            ) : (
              <div className="space-y-3">
                {recommended.map((p) => (
                  <Link key={p.id} to={`/app/projects/${p.id}`} className="card-hover block p-3.5">
                    <h3 className="truncate text-sm font-semibold text-ink-900">{p.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-500">{p.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.required_skills.slice(0, 3).map((s) => (
                        <span key={s} className="chip-skill">{s}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">Recent activity</h2>
              <Link to="/app/notifications" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                All
              </Link>
            </div>
            <div className="card divide-y divide-ink-50">
              {notifs.length === 0 ? (
                <div className="p-4 text-sm text-ink-400">No recent activity.</div>
              ) : (
                notifs.map((n) => (
                  <div key={n.id} className="flex items-start gap-2 p-3.5">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{n.title}</p>
                      <p className="text-xs text-ink-400">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone, hint,
}: {
  icon: any; label: string; value: string | number; tone: string; hint?: string;
}) {
  const toneCls: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    amber: "bg-amber-50 text-amber-600",
    accent: "bg-accent-50 text-accent-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="card p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${toneCls[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-display text-2xl font-bold text-ink-900">{value}</div>
      <div className="text-sm text-ink-500">{hint ?? label}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: Project["status"] }) {
  const cls: Record<string, string> = {
    recruiting: "chip-success",
    active: "chip-skill",
    completed: "chip-neutral",
    cancelled: "chip-danger",
  };
  return <span className={cls[status]}>{STATUS_LABELS[status]}</span>;
}
