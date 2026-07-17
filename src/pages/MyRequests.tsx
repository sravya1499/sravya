import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, ArrowRight, Clock, Check, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchMyRequests, cancelJoinRequest } from "../lib/api";
import { JoinRequest } from "../lib/types";
import { timeAgo } from "../lib/utils";
import PageHeader from "../components/PageHeader";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";
import { useToast } from "../components/Toast";

export default function MyRequests() {
  const { profile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      try { setRequests(await fetchMyRequests(profile.id)); }
      finally { setLoading(false); }
    })();
  }, [profile]);

  const onCancel = async (id: string) => {
    if (!confirm("Cancel this join request?")) return;
    try { await cancelJoinRequest(id); setRequests((p) => p.filter((r) => r.id !== id)); toast({ type: "success", message: "Request cancelled" }); }
    catch (e: any) { toast({ type: "error", message: e.message }); }
  };

  if (loading) return <InlineLoader label="Loading requests…" />;

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <PageHeader title="Join requests" subtitle="Track the requests you've sent to join projects." />

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState icon={Inbox} title="No pending requests" description="When you request to join a project, it'll appear here." action={<Link to="/app/explore" className="btn-primary">Explore projects</Link>} />
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="card flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/app/projects/${r.project_id}`} className="block truncate text-sm font-semibold text-ink-900 hover:text-brand-700">
                    {r.project?.title}
                  </Link>
                  <p className="text-xs text-ink-400">Sent {timeAgo(r.created_at)}</p>
                </div>
                <button onClick={() => onCancel(r.id)} className="btn-ghost text-rose-600 hover:bg-rose-50">Cancel</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {decided.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">History</h2>
          <div className="space-y-3">
            {decided.map((r) => (
              <div key={r.id} className="card flex items-center gap-4 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${r.status === "accepted" ? "bg-accent-50 text-accent-600" : "bg-rose-50 text-rose-600"}`}>
                  {r.status === "accepted" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={r.status === "accepted" && r.project ? `/app/team/${r.project_id}` : `/app/projects/${r.project_id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 hover:text-brand-700">
                    {r.project?.title} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <p className="text-xs text-ink-400">{r.status === "accepted" ? "Accepted" : "Declined"} {r.decided_at ? timeAgo(r.decided_at) : ""}</p>
                </div>
                <span className={r.status === "accepted" ? "chip-success" : "chip-danger"}>{r.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
