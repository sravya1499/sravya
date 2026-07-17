import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../lib/api";
import { Notification } from "../lib/types";
import { timeAgo, cn } from "../lib/utils";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      try { setNotifs(await fetchNotifications(profile.id)); }
      finally { setLoading(false); }
    })();
  }, [profile]);

  const onOpen = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifs((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    const payload = n.payload as any;
    if (payload?.project_id) navigate(`/app/team/${payload.project_id}`);
    else if (payload?.request_project_id) navigate(`/app/projects/${payload.request_project_id}`);
  };

  const onMarkAll = async () => {
    if (!profile) return;
    await markAllNotificationsRead(profile.id);
    setNotifs((p) => p.map((x) => ({ ...x, read: true })));
  };

  if (loading) return <InlineLoader label="Loading notifications…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="All your recent activity in one place."
        action={notifs.some((n) => !n.read) ? <button onClick={onMarkAll} className="btn-secondary"><CheckCheck className="h-4 w-4" /> Mark all read</button> : undefined}
      />
      {notifs.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up! Notifications about requests, messages, and deadlines will show here." />
      ) : (
        <div className="card divide-y divide-ink-50">
          {notifs.map((n) => (
            <button key={n.id} onClick={() => onOpen(n)} className={cn("flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-ink-50", !n.read && "bg-brand-50/40")}>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
              <div className={cn("min-w-0 flex-1", n.read && "ml-5")}>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-sm font-semibold", n.read ? "text-ink-600" : "text-ink-900")}>{n.title}</p>
                  <span className="shrink-0 text-xs text-ink-400">{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p className="mt-0.5 text-sm text-ink-500">{n.body}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
