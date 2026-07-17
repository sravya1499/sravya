import { useEffect, useState, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Compass, FolderKanban, Inbox, Bell, User as UserIcon,
  Shield, LogOut, Menu, X, Sparkles, Search,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../lib/api";
import { Notification } from "../lib/types";
import { cn, timeAgo } from "../lib/utils";
import Avatar from "./Avatar";

export default function AppLayout() {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const loadNotifs = useCallback(async () => {
    if (!profile) return;
    setNotifLoading(true);
    try {
      const n = await fetchNotifications(profile.id);
      setNotifs(n);
    } finally {
      setNotifLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadNotifs();
  }, [loadNotifs]);

  // Realtime notifications
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        () => loadNotifs(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, loadNotifs]);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const unread = notifs.filter((n) => !n.read).length;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const onOpenNotif = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    const p = n.payload as any;
    if (p?.project_id) navigate(`/app/team/${p.project_id}`);
    if (p?.request_project_id) navigate(`/app/projects/${p.request_project_id}`);
    setNotifOpen(false);
  };

  const navItems = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/explore", label: "Explore Projects", icon: Compass },
    { to: "/app/projects", label: "My Projects", icon: FolderKanban },
    { to: "/app/requests", label: "Join Requests", icon: Inbox },
    { to: "/app/profile", label: "My Profile", icon: UserIcon },
  ];

  if (profile?.role === "admin") {
    navItems.push({ to: "/app/admin", label: "Admin", icon: Shield });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-ink-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-ink-100 px-5">
          <NavLink to="/app" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <span className="font-display text-lg font-bold text-ink-900">Collabra</span>
          </NavLink>
          <button onClick={() => setMobileOpen(false)} className="btn-ghost p-2 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-ink-100 p-3">
          <button onClick={handleSignOut} className="btn-ghost w-full justify-start">
            <LogOut className="h-4.5 w-4.5" />
            Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden flex-1 sm:block">
            <button
              onClick={() => navigate("/app/explore")}
              className="flex w-full max-w-md items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-400 transition-colors hover:bg-ink-100"
            >
              <Search className="h-4 w-4" />
              Search projects, skills, teammates…
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) loadNotifs(); }}
                className="btn-ghost relative p-2"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <NotifPanel
                  notifs={notifs}
                  loading={notifLoading}
                  onOpen={onOpenNotif}
                  onMarkAll={async () => {
                    if (!profile) return;
                    await markAllNotificationsRead(profile.id);
                    setNotifs((prev) => prev.map((x) => ({ ...x, read: true })));
                  }}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </div>
            <NavLink
              to="/app/profile"
              className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-ink-100"
            >
              <Avatar name={profile?.full_name || "?"} src={profile?.avatar_url} size="sm" />
              <div className="hidden text-left sm:block">
                <div className="max-w-[120px] truncate text-sm font-semibold text-ink-800">
                  {profile?.full_name}
                </div>
                <div className="text-xs text-ink-500">
                  {profile?.role === "admin" ? "Admin" : "Student"}
                </div>
              </div>
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function NotifPanel({
  notifs, loading, onOpen, onMarkAll, onClose,
}: {
  notifs: Notification[];
  loading: boolean;
  onOpen: (n: Notification) => void;
  onMarkAll: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 origin-top-right animate-fade-in">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-sm font-semibold text-ink-900">Notifications</h3>
            {notifs.some((n) => !n.read) && (
              <button onClick={onMarkAll} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-ink-400">Loading…</div>
            ) : notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink-400">No notifications yet.</div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onOpen(n)}
                  className={cn(
                    "flex w-full flex-col gap-1 border-b border-ink-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-ink-50",
                    !n.read && "bg-brand-50/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    <span className={cn("text-sm font-semibold", n.read ? "text-ink-700" : "text-ink-900")}>
                      {n.title}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-ink-400">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="text-xs text-ink-500">{n.body}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
