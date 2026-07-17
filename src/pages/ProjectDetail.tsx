import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, Clock, Calendar, Github, Check, X,
  MessageSquare, Flag, UserPlus, Inbox,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  fetchProject, fetchRequestsForProject, createJoinRequest, decideJoinRequest,
  pushNotification, createReport,
} from "../lib/api";
import { Project, JoinRequest } from "../lib/types";
import { STATUS_LABELS, AVAILABILITY_LABELS } from "../lib/types";
import { deadlineLabel, formatDate, timeAgo, daysUntil } from "../lib/utils";
import Avatar from "../components/Avatar";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";
import { useToast } from "../components/Toast";
import { StatusBadge } from "./Dashboard";

export default function ProjectDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, reqs] = await Promise.all([
        fetchProject(id),
        fetchRequestsForProject(id),
      ]);
      setProject(p);
      setRequests(reqs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <InlineLoader label="Loading project…" />;
  if (!project) {
    return (
      <EmptyState
        icon={Inbox}
        title="Project not found"
        description="This project may have been deleted."
        action={<Link to="/app/explore" className="btn-primary">Back to explore</Link>}
      />
    );
  }

  const isOwner = project.created_by === profile?.id;
  const myMembership = project.members?.find((m) => m.user_id === profile?.id);
  const isMember = !!myMembership;
  const myRequest = requests.find((r) => r.user_id === profile?.id);
  const full = (project.members?.length ?? 0) >= project.team_size;

  const onJoin = async (message: string) => {
    if (!profile || !id) return;
    try {
      await createJoinRequest(id, profile.id, message);
      await pushNotification({
        user_id: project.created_by,
        type: "request",
        title: `New join request for "${project.title}"`,
        body: `${profile.full_name} wants to join your project.`,
        payload: { request_project_id: project.id, requester_id: profile.id },
      });
      toast({ type: "success", message: "Join request sent!" });
      setJoinOpen(false);
      load();
    } catch (err: any) {
      toast({ type: "error", message: err.message ?? "Failed to send request" });
    }
  };

  const onDecide = async (req: JoinRequest, status: "accepted" | "rejected") => {
    try {
      await decideJoinRequest(req.id, status, req.project_id, req.user_id);
      await pushNotification({
        user_id: req.user_id,
        type: "reply",
        title: status === "accepted"
          ? `You're in! Welcome to "${project.title}"`
          : `Your request to join "${project.title}" was declined`,
        body: status === "accepted"
          ? "The team owner accepted your join request."
          : "The team owner declined your join request.",
        payload: { project_id: project.id },
      });
      toast({ type: status === "accepted" ? "success" : "info", message: status === "accepted" ? "Accepted — member added." : "Request declined." });
      load();
    } catch (err: any) {
      toast({ type: "error", message: err.message ?? "Failed" });
    }
  };

  const onReport = async (reason: string) => {
    if (!profile) return;
    try {
      await createReport({ target_type: "project", target_id: project.id, reason });
      toast({ type: "success", message: "Report submitted. Admins will review." });
      setReportOpen(false);
    } catch (err: any) {
      toast({ type: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/app/explore" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to explore
      </Link>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-600 to-brand-800" />
        <div className="px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="-mt-10 flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card ring-1 ring-ink-100">
                <Github className="h-8 w-8 text-brand-600" />
              </div>
              <div className="mt-10">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-ink-900">{project.title}</h1>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  Posted {timeAgo(project.created_at)} by{" "}
                  <Link to={`/app/profile/${project.creator?.username}`} className="font-semibold text-brand-600 hover:underline">
                    {project.creator?.full_name}
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:mt-2">
              {isMember ? (
                <button onClick={() => navigate(`/app/team/${project.id}`)} className="btn-primary">
                  <MessageSquare className="h-4 w-4" /> Open workspace
                </button>
              ) : myRequest?.status === "pending" ? (
                <span className="chip-warn">Request pending</span>
              ) : myRequest?.status === "rejected" ? (
                <span className="chip-danger">Request declined</span>
              ) : project.status === "recruiting" && !full ? (
                <button onClick={() => setJoinOpen(true)} className="btn-primary">
                  <UserPlus className="h-4 w-4" /> Request to join
                </button>
              ) : full ? (
                <span className="chip-neutral">Team is full</span>
              ) : null}
              {!isOwner && (
                <button onClick={() => setReportOpen(true)} className="btn-ghost">
                  <Flag className="h-4 w-4" /> Report
                </button>
              )}
            </div>
          </div>

          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-700">{project.description}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <InfoTile icon={Users} label="Team size" value={`${project.members?.length ?? 0}/${project.team_size}`} />
            <InfoTile icon={Clock} label="Deadline" value={deadlineLabel(project.deadline)} warn={daysUntil(project.deadline) !== null && daysUntil(project.deadline)! < 7} />
            <InfoTile icon={Calendar} label="Created" value={formatDate(project.created_at) || "—"} />
            <InfoTile icon={Github} label="Repository" value={project.github_repo_url ? "Linked" : "None"} />
          </div>

          {project.required_skills.length > 0 && (
            <div className="mt-5">
              <h3 className="label">Required skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {project.required_skills.map((s) => (
                  <span key={s} className="chip-skill">{s}</span>
                ))}
              </div>
            </div>
          )}
          {project.domains.length > 0 && (
            <div className="mt-4">
              <h3 className="label">Domains</h3>
              <div className="flex flex-wrap gap-1.5">
                {project.domains.map((d) => (
                  <span key={d} className="chip-domain">{d}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team */}
        <div className="card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Team members</h2>
          <div className="space-y-3">
            {project.members?.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3">
                <Avatar name={m.profile?.full_name || "?"} src={m.profile?.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/app/profile/${m.profile?.username}`} className="block truncate text-sm font-semibold text-ink-900 hover:text-brand-700">
                    {m.profile?.full_name}
                  </Link>
                  <p className="truncate text-xs text-ink-500">{m.profile?.headline || m.profile?.major}</p>
                </div>
                <span className={`chip capitalize ${m.role === "owner" ? "chip-skill" : m.role === "lead" ? "chip-domain" : "chip-neutral"}`}>
                  {m.role}
                </span>
              </div>
            ))}
            {(!project.members || project.members.length === 0) && (
              <p className="text-sm text-ink-400">No members yet.</p>
            )}
          </div>
        </div>

        {/* Join requests (owner only) */}
        {isOwner && (
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">Join requests</h2>
              <span className="chip-neutral">{requests.filter((r) => r.status === "pending").length} pending</span>
            </div>
            <div className="space-y-3">
              {requests.filter((r) => r.status === "pending").length === 0 && (
                <p className="text-sm text-ink-400">No pending requests.</p>
              )}
              {requests.filter((r) => r.status === "pending").map((r) => (
                <div key={r.id} className="rounded-lg border border-ink-200 p-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.profile?.full_name || "?"} src={r.profile?.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/profile/${r.profile?.username}`} className="block truncate text-sm font-semibold text-ink-900 hover:text-brand-700">
                        {r.profile?.full_name}
                      </Link>
                      <p className="text-xs text-ink-400">Requested {timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                  {r.message && <p className="mt-2 rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-600">{r.message}</p>}
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={() => onDecide(r, "accepted")} className="btn-primary flex-1 py-1.5 text-xs">
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button onClick={() => onDecide(r, "rejected")} className="btn-secondary flex-1 py-1.5 text-xs">
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))}
              {requests.filter((r) => r.status !== "pending").length > 0 && (
                <div className="border-t border-ink-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-ink-400">Decided</p>
                  {requests.filter((r) => r.status !== "pending").slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="flex-1 truncate text-ink-600">{r.profile?.full_name}</span>
                      <span className={r.status === "accepted" ? "chip-success" : "chip-danger"}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <JoinRequestModal open={joinOpen} onClose={() => setJoinOpen(false)} onSubmit={onJoin} projectTitle={project.title} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={onReport} />
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, warn }: { icon: any; label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-ink-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${warn ? "text-amber-600" : "text-ink-800"}`}>{value}</div>
    </div>
  );
}

function JoinRequestModal({ open, onClose, onSubmit, projectTitle }: { open: boolean; onClose: () => void; onSubmit: (msg: string) => void; projectTitle: string }) {
  const [message, setMessage] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request to join"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onSubmit(message)} className="btn-primary">Send request</button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink-600">Introduce yourself to the owner of <span className="font-semibold">"{projectTitle}"</span>.</p>
      <label className="label">Message (optional)</label>
      <textarea
        className="input min-h-[90px] resize-y"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Hi! I'm interested in this project because… I can contribute with…"
        maxLength={500}
      />
    </Modal>
  );
}

export function ReportModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit a report"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => { if (reason.trim()) { onSubmit(reason.trim()); setReason(""); } }} disabled={!reason.trim()} className="btn-danger">Submit report</button>
        </>
      }
    >
      <label className="label">Reason</label>
      <textarea
        className="input min-h-[90px] resize-y"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Describe the issue (spam, harassment, inappropriate content…)"
        maxLength={500}
      />
    </Modal>
  );
}
