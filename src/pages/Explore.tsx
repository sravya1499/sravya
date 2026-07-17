import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, Plus, Users, Clock, X } from "lucide-react";
import { fetchProjects } from "../lib/api";
import { Project, SUGGESTED_SKILLS, SUGGESTED_DOMAINS } from "../lib/types";
import { deadlineLabel, truncate } from "../lib/utils";
import PageHeader from "../components/PageHeader";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";
import { StatusBadge } from "./Dashboard";
import CreateProjectModal from "../components/CreateProjectModal";
import { useAuth } from "../lib/auth";

export default function Explore() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [status, setStatus] = useState("recruiting");
  const [showFilters, setShowFilters] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchProjects({
          query: query || undefined,
          skills: skills.length ? skills : undefined,
          domains: domains.length ? domains : undefined,
          status: status || undefined,
          limit: 50,
        });
        if (!cancelled) setProjects(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, skills, domains, status]);

  const activeFilterCount = skills.length + domains.length + (status !== "recruiting" ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explore projects"
        subtitle="Find projects to join — search by title, skills, domains, or status."
        action={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Post a project
          </button>
        }
      />

      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or keyword…"
            className="input pl-10"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`btn-secondary ${showFilters ? "border-brand-300 bg-brand-50 text-brand-700" : ""}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="card animate-fade-in space-y-4 p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Status</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {["recruiting", "active", "completed", "cancelled", "all"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`chip capitalize ${status === s ? "bg-brand-600 text-white border-brand-600" : "chip-neutral hover:bg-ink-200"}`}
                >
                  {s === "all" ? "All statuses" : s}
                </button>
              ))}
            </div>
          </div>
          <FilterGroup label="Required skills" options={SUGGESTED_SKILLS} selected={skills} onToggle={(s) => setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])} chipClass="chip-skill" />
          <FilterGroup label="Domains" options={SUGGESTED_DOMAINS} selected={domains} onToggle={(s) => setDomains((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])} chipClass="chip-domain" />
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSkills([]); setDomains([]); setStatus("recruiting"); }}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <InlineLoader label="Searching projects…" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No projects found"
          description="Try adjusting your filters, or be the first to post a project in this space."
          action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Post a project</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} myId={profile?.id} />
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function FilterGroup({
  label, options, selected, onToggle, chipClass,
}: {
  label: string; options: string[]; selected: string[];
  onToggle: (s: string) => void; chipClass: string;
}) {
  const visible = useMemo(() => options.slice(0, 14), [options]);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((s) => {
          const active = selected.includes(s);
          return (
            <button
              key={s}
              onClick={() => onToggle(s)}
              className={`${chipClass} cursor-pointer transition-all ${active ? "ring-2 ring-brand-400 ring-offset-1" : "hover:scale-105"}`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectCard({ project, myId }: { project: Project; myId?: string }) {
  const isMember = project.members?.some((m) => m.user_id === myId) || project.created_by === myId;
  const full = (project.members?.length ?? 0) >= project.team_size;
  return (
    <Link to={`/app/projects/${project.id}`} className="card-hover group flex flex-col p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-ink-900 group-hover:text-brand-700">{project.title}</h3>
        <StatusBadge status={project.status} />
      </div>
      <p className="mb-3 line-clamp-2 flex-1 text-sm text-ink-500">{truncate(project.description, 140)}</p>

      {project.required_skills.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {project.required_skills.slice(0, 4).map((s) => (
            <span key={s} className="chip-skill">{s}</span>
          ))}
          {project.required_skills.length > 4 && (
            <span className="chip-neutral">+{project.required_skills.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-ink-100 pt-3">
        <div className="flex -space-x-2">
          {project.members?.slice(0, 4).map((m) => (
            <Avatar key={m.user_id} name={m.profile?.full_name || "?"} src={m.profile?.avatar_url} size="xs" className="ring-2 ring-white" />
          ))}
          {project.members && project.members.length === 0 && (
            <span className="text-xs text-ink-400">No members yet</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-400">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {project.members?.length ?? 0}/{project.team_size}
          </span>
          {project.deadline && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {deadlineLabel(project.deadline)}
            </span>
          )}
        </div>
      </div>
      {isMember && <div className="mt-2 text-xs font-semibold text-brand-600">You're a member</div>}
      {!isMember && full && project.status === "recruiting" && (
        <div className="mt-2 text-xs font-semibold text-amber-600">Team is full</div>
      )}
    </Link>
  );
}
