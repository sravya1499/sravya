import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, ListChecks, MessageSquare, Github, Plus, Trash2, Send, Calendar, Crown, UserCog, Star, GitFork, RefreshCw, ExternalLink, MoveVertical as MoreVertical, Flag, Loader as Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import {
  fetchProject, fetchMembers, fetchTasks, fetchMessages, fetchRequestsForProject,
  createTask, updateTask, deleteTask, sendMessage, updateMemberRole, removeMember,
  fetchGithubRepo, fetchGithubCommits, linkGithubRepo, unlinkGithubRepo, refreshGithubCommits,
  pushNotification, updateProject,
} from "../lib/api";
import {
  Project, ProjectMember, Task, Message, JoinRequest, GithubRepo, GithubCommit,
  TaskStatus, TaskPriority, MemberRole,
} from "../lib/types";
import {
  TASK_STATUS_LABELS, PRIORITY_LABELS, MEMBER_ROLE_LABELS, STATUS_LABELS,
} from "../lib/types";
import { deadlineLabel, formatDate, timeAgo, cn } from "../lib/utils";
import Avatar from "../components/Avatar";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";
import { useToast } from "../components/Toast";
import { ReportModal } from "./ProjectDetail";

type Tab = "tasks" | "team" | "chat" | "github";

export default function TeamWorkspace() {
  const { id } = useParams();
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [tab, setTab] = useState<Tab>("tasks");
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, m, t, msg, reqs] = await Promise.all([
        fetchProject(id), fetchMembers(id), fetchTasks(id), fetchMessages(id), fetchRequestsForProject(id),
      ]);
      setProject(p);
      setMembers(m);
      setTasks(t);
      setMessages(msg);
      setRequests(reqs);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Realtime: messages
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`ws-msg-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // fetch sender details for the new message
          (async () => {
            const { data } = await supabase
              .from("profiles")
              .select("id, full_name, username, avatar_url")
              .eq("id", newMsg.sender_id)
              .maybeSingle();
            if (data) {
              setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, sender: data as any } : m)));
            }
          })();
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Realtime: tasks
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`ws-tasks-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${id}` },
        () => { (async () => { setTasks(await fetchTasks(id)); })(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Realtime: members
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`ws-members-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_members", filter: `project_id=eq.${id}` },
        () => { (async () => { setMembers(await fetchMembers(id)); setProject(await fetchProject(id)); })(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (loading) return <InlineLoader label="Loading workspace…" />;
  if (!project) return <EmptyState icon={ListChecks} title="Project not found" action={<Link to="/app/explore" className="btn-primary">Back to explore</Link>} />;

  const myMembership = members.find((m) => m.user_id === profile?.id);
  const isMember = !!myMembership;
  const isLead = myMembership?.role === "owner" || myMembership?.role === "lead";
  const isOwner = project.created_by === profile?.id;

  if (!isMember) {
    return (
      <EmptyState
        icon={Users}
        title="You're not part of this team"
        description="Join this project to access the team workspace."
        action={<Link to={`/app/projects/${project.id}`} className="btn-primary">View project</Link>}
      />
    );
  }

  const progress = tasks.length
    ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
    : 0;

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: "tasks", label: "Tasks", icon: ListChecks, badge: tasks.filter((t) => t.status !== "done").length },
    { key: "team", label: "Team", icon: Users, badge: members.length },
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "github", label: "GitHub", icon: Github },
  ];

  return (
    <div className="space-y-6">
      <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> My projects
      </Link>

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-ink-900">{project.title}</h1>
              <span className={`chip ${project.status === "recruiting" ? "chip-success" : project.status === "active" ? "chip-skill" : "chip-neutral"}`}>
                {STATUS_LABELS[project.status]}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-ink-500">{project.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-400">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {members.length}/{project.team_size} members</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {deadlineLabel(project.deadline)}</span>
              <span>{requests.filter((r) => r.status === "pending").length} pending requests</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLead && (
              <select
                value={project.status}
                onChange={async (e) => { await updateProject(project.id, { status: e.target.value as any }); setProject({ ...project, status: e.target.value as any }); toast({ type: "success", message: "Status updated" }); }}
                className="input w-auto py-1.5 text-xs"
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            {!isOwner && <button onClick={() => setReportOpen(true)} className="btn-ghost"><Flag className="h-4 w-4" /></button>}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-700">Project progress</span>
            <span className="text-ink-500">{progress}% · {tasks.filter((t) => t.status === "done").length}/{tasks.length} tasks done</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-ink-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.key ? "text-brand-700" : "text-ink-500 hover:text-ink-800",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.badge ? <span className="chip-neutral px-1.5 py-0 text-[10px]">{t.badge}</span> : null}
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      {tab === "tasks" && <TasksTab project={project} tasks={tasks} members={members} isLead={isLead} myId={profile?.id || ""} />}
      {tab === "team" && <TeamTab project={project} members={members} requests={requests} isLead={isLead} isOwner={isOwner} myId={profile?.id || ""} onRefresh={load} />}
      {tab === "chat" && <ChatTab project={project} messages={messages} members={members} myId={profile?.id || ""} />}
      {tab === "github" && <GithubTab project={project} isLead={isLead} />}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={async (reason) => {
        if (!profile) return;
        try { await import("../lib/api").then(m => m.createReport({ target_type: "project", target_id: project.id, reason })); toast({ type: "success", message: "Report submitted" }); setReportOpen(false); }
        catch (e: any) { toast({ type: "error", message: e.message }); }
      }} />
    </div>
  );
}

// ----------------- TASKS TAB -----------------
function TasksTab({ project, tasks, members, isLead, myId }: { project: Project; tasks: Task[]; members: ProjectMember[]; isLead: boolean; myId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const toast = useToast();

  const cols: { key: TaskStatus; label: string; tone: string }[] = [
    { key: "todo", label: "To Do", tone: "border-ink-300" },
    { key: "in_progress", label: "In Progress", tone: "border-brand-400" },
    { key: "done", label: "Done", tone: "border-accent-400" },
  ];

  const onStatusChange = async (task: Task, status: TaskStatus) => {
    try { await updateTask(task.id, { status }); } catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const onDelete = async (id: string) => {
    try { await deleteTask(id); toast({ type: "success", message: "Task deleted" }); }
    catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["all", "todo", "in_progress", "done"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "bg-brand-600 text-white border-brand-600" : "chip-neutral hover:bg-ink-200"}`}>
              {f === "all" ? "All" : TASK_STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        {isLead && <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> New task</button>}
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks yet" description={isLead ? "Create your first task to start tracking progress." : "Tasks will appear here once leads add them."} action={isLead ? <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> New task</button> : undefined} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {cols.map((col) => {
            const colTasks = visible.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className={`rounded-xl border-t-2 ${col.tone} bg-ink-50/40`}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <h3 className="text-sm font-semibold text-ink-800">{col.label}</h3>
                  <span className="chip-neutral px-1.5 py-0 text-[10px]">{colTasks.length}</span>
                </div>
                <div className="space-y-2 px-2 pb-3">
                  {colTasks.map((t) => (
                    <div key={t.id} className="card group p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-ink-900">{t.title}</h4>
                        {isLead && (
                          <button onClick={() => onDelete(t.id)} className="text-ink-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {t.description && <p className="mt-1 text-xs text-ink-500">{t.description}</p>}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={`chip ${t.priority === "high" ? "chip-danger" : t.priority === "medium" ? "chip-warn" : "chip-neutral"}`}>{PRIORITY_LABELS[t.priority]}</span>
                        {t.due_date && <span className={cn("chip", daysUntilSafe(t.due_date) < 0 ? "chip-danger" : daysUntilSafe(t.due_date) < 7 ? "chip-warn" : "chip-neutral")}><Calendar className="h-3 w-3" />{deadlineLabel(t.due_date)}</span>}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-ink-100 pt-2.5">
                        {t.assigned_to ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={t.assignee?.full_name || "?"} src={t.assignee?.avatar_url} size="xs" />
                            <span className="text-xs text-ink-600">{t.assignee?.full_name}</span>
                          </div>
                        ) : <span className="text-xs text-ink-400">Unassigned</span>}
                        <select
                          value={t.status}
                          onChange={(e) => onStatusChange(t, e.target.value as TaskStatus)}
                          className="rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-xs text-ink-700 focus:border-brand-400 focus:outline-none"
                        >
                          {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && <div className="rounded-lg border border-dashed border-ink-200 py-6 text-center text-xs text-ink-300">No tasks</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} project={project} members={members} />
    </div>
  );
}

function daysUntilSafe(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function CreateTaskModal({ open, onClose, project, members }: { open: boolean; onClose: () => void; project: Project; members: ProjectMember[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const t = await createTask({
        project_id: project.id,
        title: title.trim(),
        description: description.trim(),
        priority,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
      });
      if (assignedTo) {
        await pushNotification({
          user_id: assignedTo,
          type: "update",
          title: `New task assigned: "${title.trim()}"`,
          body: `In project "${project.title}"`,
          payload: { project_id: project.id },
        });
      }
      toast({ type: "success", message: "Task created" });
      setTitle(""); setDescription(""); setPriority("medium"); setDueDate(""); setAssignedTo("");
      onClose();
    } catch (e: any) { toast({ type: "error", message: e.message }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create task" footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={submit} disabled={saving || !title.trim()} className="btn-primary">{saving ? "Creating…" : "Create task"}</button></>}>
      <div className="space-y-4">
        <div><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build auth flow" /></div>
        <div><label className="label">Description</label><textarea className="input min-h-[70px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Priority</label><select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label">Due date</label><input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <div>
          <label className="label">Assign to</label>
          <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name} ({m.role})</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ----------------- TEAM TAB -----------------
function TeamTab({ project, members, requests, isLead, isOwner, myId, onRefresh }: { project: Project; members: ProjectMember[]; requests: JoinRequest[]; isLead: boolean; isOwner: boolean; myId: string; onRefresh: () => void }) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const onRoleChange = async (userId: string, role: MemberRole) => {
    try { await updateMemberRole(project.id, userId, role); toast({ type: "success", message: "Role updated" }); onRefresh(); setMenuOpen(null); }
    catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const onRemove = async (userId: string) => {
    if (!confirm("Remove this member from the team?")) return;
    try { await removeMember(project.id, userId); toast({ type: "success", message: "Member removed" }); onRefresh(); setMenuOpen(null); }
    catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      {isLead && pending.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-display text-base font-semibold text-ink-900">Pending join requests ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-ink-200 p-3">
                <Avatar name={r.profile?.full_name || "?"} src={r.profile?.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/app/profile/${r.profile?.username}`} className="block truncate text-sm font-semibold text-ink-900 hover:text-brand-700">{r.profile?.full_name}</Link>
                  {r.message && <p className="truncate text-xs text-ink-500">{r.message}</p>}
                </div>
                <Link to={`/app/projects/${project.id}`} className="btn-secondary py-1.5 text-xs">Review</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="mb-4 font-display text-base font-semibold text-ink-900">Team members ({members.length}/{project.team_size})</h3>
        <div className="space-y-3">
          {members.map((m) => {
            const isMe = m.user_id === myId;
            const canManage = isLead && !isMe && m.role !== "owner";
            return (
              <div key={m.user_id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-3">
                <Avatar name={m.profile?.full_name || "?"} src={m.profile?.avatar_url} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link to={`/app/profile/${m.profile?.username}`} className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700">{m.profile?.full_name}{isMe && " (you)"}</Link>
                    {m.role === "owner" && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                    {m.role === "lead" && <UserCog className="h-3.5 w-3.5 text-brand-500" />}
                  </div>
                  <p className="truncate text-xs text-ink-500">{m.profile?.headline || m.profile?.major || "—"}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.profile?.skills?.slice(0, 3).map((s) => <span key={s} className="chip-skill px-1.5 py-0 text-[10px]">{s}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`chip capitalize ${m.role === "owner" ? "chip-skill" : m.role === "lead" ? "chip-domain" : "chip-neutral"}`}>{MEMBER_ROLE_LABELS[m.role]}</span>
                  {canManage && (
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === m.user_id ? null : m.user_id)} className="btn-ghost p-1.5"><MoreVertical className="h-4 w-4" /></button>
                      {menuOpen === m.user_id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-9 z-40 w-44 animate-fade-in rounded-lg border border-ink-200 bg-white py-1 shadow-card">
                            <button onClick={() => onRoleChange(m.user_id, "lead")} className="block w-full px-3 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50">Make team lead</button>
                            <button onClick={() => onRoleChange(m.user_id, "member")} className="block w-full px-3 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50">Make member</button>
                            <div className="my-1 border-t border-ink-100" />
                            <button onClick={() => onRemove(m.user_id)} className="block w-full px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50">Remove member</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------------- CHAT TAB -----------------
function ChatTab({ project, messages, members, myId }: { project: Project; messages: Message[]; members: ProjectMember[]; myId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const onSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(project.id, text.trim());
      setText("");
      // notify other members
      members.filter((m) => m.user_id !== myId).forEach((m) => {
        pushNotification({ user_id: m.user_id, type: "message", title: `New message in "${project.title}"`, body: "You have a new team message.", payload: { project_id: project.id } });
      });
    } catch (err: any) { toast({ type: "error", message: err.message }); }
    finally { setSending(false); }
  };

  return (
    <div className="card flex h-[60vh] flex-col">
      <div className="border-b border-ink-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {members.slice(0, 5).map((m) => <Avatar key={m.user_id} name={m.profile?.full_name || "?"} src={m.profile?.avatar_url} size="xs" className="ring-2 ring-white" />)}
          </div>
          <span className="text-sm font-semibold text-ink-800">Team chat</span>
          <span className="flex items-center gap-1 text-xs text-accent-600"><span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulseDot" /> Live</span>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <MessageSquare className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-2 text-sm text-ink-400">No messages yet. Start the conversation!</p>
            </div>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
              <Avatar name={m.sender?.full_name || "?"} src={m.sender?.avatar_url} size="sm" className="mt-0.5" />
              <div className={cn("max-w-[75%]", mine && "items-end flex flex-col")}>
                <div className={cn("flex items-center gap-2", mine && "flex-row-reverse")}>
                  <span className="text-xs font-semibold text-ink-800">{mine ? "You" : m.sender?.full_name}</span>
                  <span className="text-[10px] text-ink-400">{timeAgo(m.created_at)}</span>
                </div>
                <div className={cn("mt-1 rounded-2xl px-3.5 py-2 text-sm", mine ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-800")}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={onSend} className="flex items-center gap-2 border-t border-ink-100 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="input flex-1"
          maxLength={500}
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-3">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

// ----------------- GITHUB TAB -----------------
function GithubTab({ project, isLead }: { project: Project; isLead: boolean }) {
  const [repo, setRepo] = useState<GithubRepo | null>(null);
  const [commits, setCommits] = useState<GithubCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchGithubRepo(project.id);
      setRepo(r);
      if (r) setCommits(await fetchGithubCommits(r.id));
    } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const onLink = async () => {
    if (!repoInput.trim()) return;
    const clean = repoInput.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    if (!clean.includes("/")) { toast({ type: "error", message: "Use owner/repo format, e.g. facebook/react" }); return; }
    try {
      await linkGithubRepo(project.id, clean);
      toast({ type: "success", message: "Repository linked" });
      setLinkOpen(false); setRepoInput("");
      load();
    } catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const onUnlink = async () => {
    if (!confirm("Unlink this repository? Cached commits will be removed.")) return;
    try { await unlinkGithubRepo(project.id); toast({ type: "success", message: "Repository unlinked" }); setRepo(null); setCommits([]); }
    catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await refreshGithubCommits(project.id);
      toast({ type: "success", message: `Synced ${res.commits} commits from ${res.repo}` });
      load();
    } catch (e: any) { toast({ type: "error", message: e.message }); }
    finally { setSyncing(false); }
  };

  if (loading) return <InlineLoader label="Loading GitHub data…" />;

  return (
    <div className="space-y-5">
      {!repo ? (
        <EmptyState
          icon={Github}
          title="No repository linked"
          description={isLead ? "Connect a GitHub repo to display commits and track development activity." : "The team owner hasn't linked a repository yet."}
          action={isLead ? <button onClick={() => setLinkOpen(true)} className="btn-primary"><Github className="h-4 w-4" /> Link repository</button> : undefined}
        />
      ) : (
        <>
          <div className="card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-900 text-white">
                  <Github className="h-6 w-6" />
                </div>
                <div>
                  <a href={repo.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-display text-base font-semibold text-ink-900 hover:text-brand-700">
                    {repo.repo_full_name}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {repo.description && <p className="mt-0.5 text-sm text-ink-500">{repo.description}</p>}
                  <div className="mt-2 flex items-center gap-4 text-xs text-ink-500">
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {repo.stars}</span>
                    <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" /> {repo.forks}</span>
                    {repo.default_branch && <span className="chip-neutral px-1.5 py-0">branch: {repo.default_branch}</span>}
                    <span>Synced {timeAgo(repo.last_fetched_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onSync} disabled={syncing} className="btn-secondary">
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {syncing ? "Syncing…" : "Sync commits"}
                </button>
                {isLead && <button onClick={onUnlink} className="btn-ghost text-rose-600 hover:bg-rose-50">Unlink</button>}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-display text-base font-semibold text-ink-900">Recent commits ({commits.length})</h3>
            {commits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink-200 py-10 text-center text-sm text-ink-400">
                No commits synced yet. Click <span className="font-semibold">Sync commits</span> to fetch the latest activity.
              </div>
            ) : (
              <div className="space-y-1">
                {commits.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-ink-50">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600">
                      {(c.author || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{c.message}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
                        <span>{c.author}</span>
                        <span>·</span>
                        <span>{c.author_date ? timeAgo(c.author_date) : ""}</span>
                        <a href={c.url || "#"} target="_blank" rel="noreferrer" className="ml-auto font-mono text-[10px] text-brand-600 hover:underline">
                          {c.sha.slice(0, 7)}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Link GitHub repository" footer={<><button onClick={() => setLinkOpen(false)} className="btn-secondary">Cancel</button><button onClick={onLink} disabled={!repoInput.trim()} className="btn-primary">Link repo</button></>}>
        <label className="label">Repository (owner/repo or full URL)</label>
        <input className="input" value={repoInput} onChange={(e) => setRepoInput(e.target.value)} placeholder="e.g. facebook/react or https://github.com/your/repo" />
        <p className="mt-2 text-xs text-ink-400">Public repos work without authentication. Private repos require a server-side GitHub token.</p>
      </Modal>
    </div>
  );
}
