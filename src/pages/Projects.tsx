import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Plus, Users, Clock } from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchProjects } from "../lib/api";
import { Project } from "../lib/types";
import { deadlineLabel } from "../lib/utils";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";
import CreateProjectModal from "../components/CreateProjectModal";
import { ProjectCard } from "./Explore";

export default function Projects() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      try {
        const all = await fetchProjects({ limit: 100 });
        setProjects(all.filter((p) => p.created_by === profile.id || p.members?.some((m) => m.user_id === profile.id)));
      } finally { setLoading(false); }
    })();
  }, [profile]);

  if (loading) return <InlineLoader label="Loading your projects…" />;

  const owned = projects.filter((p) => p.created_by === profile?.id);
  const member = projects.filter((p) => p.created_by !== profile?.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="My projects"
        subtitle="Projects you've created or joined."
        action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Post a project</button>}
      />

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Projects you own ({owned.length})</h2>
        {owned.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Post your first project idea to start building a team."
            action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Post a project</button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map((p) => <ProjectCard key={p.id} project={p} myId={profile?.id} />)}
          </div>
        )}
      </section>

      {member.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Teams you've joined ({member.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {member.map((p) => <ProjectCard key={p.id} project={p} myId={profile?.id} />)}
          </div>
        </section>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
