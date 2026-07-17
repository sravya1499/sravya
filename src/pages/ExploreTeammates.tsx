import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, Users, MapPin, Github, X } from "lucide-react";
import { searchProfiles } from "../lib/api";
import { Profile, SUGGESTED_SKILLS, SUGGESTED_DOMAINS, AVAILABILITY_LABELS } from "../lib/types";
import { truncate } from "../lib/utils";
import PageHeader from "../components/PageHeader";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";

export default function ExploreTeammates() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [availability, setAvailability] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchProfiles({
          query: query || undefined,
          skills: skills.length ? skills : undefined,
          domains: domains.length ? domains : undefined,
          availability,
          limit: 30,
        });
        if (!cancelled) setProfiles(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, skills, domains, availability]);

  const activeFilterCount = skills.length + domains.length + (availability !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find teammates"
        subtitle="Search for students by skills, domains, and availability to build your dream team."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, headline, or bio…"
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
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">{activeFilterCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="card animate-fade-in space-y-4 p-5">
          <div>
            <label className="label">Availability</label>
            <div className="flex flex-wrap gap-2">
              {["all", "available", "busy", "unavailable"].map((a) => (
                <button key={a} onClick={() => setAvailability(a)} className={`chip capitalize ${availability === a ? "bg-brand-600 text-white border-brand-600" : "chip-neutral hover:bg-ink-200"}`}>
                  {a === "all" ? "Any" : AVAILABILITY_LABELS[a as keyof typeof AVAILABILITY_LABELS]}
                </button>
              ))}
            </div>
          </div>
          <FilterRow label="Skills" options={SUGGESTED_SKILLS} selected={skills} onToggle={(s) => setSkills((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])} chipClass="chip-skill" />
          <FilterRow label="Domains" options={SUGGESTED_DOMAINS} selected={domains} onToggle={(s) => setDomains((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])} chipClass="chip-domain" />
          {activeFilterCount > 0 && (
            <button onClick={() => { setSkills([]); setDomains([]); setAvailability("all"); }} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <InlineLoader label="Searching teammates…" />
      ) : profiles.length === 0 ? (
        <EmptyState icon={Users} title="No teammates found" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => <TeammateCard key={p.id} profile={p} />)}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, options, selected, onToggle, chipClass }: { label: string; options: string[]; selected: string[]; onToggle: (s: string) => void; chipClass: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.slice(0, 14).map((s) => {
          const active = selected.includes(s);
          return (
            <button key={s} onClick={() => onToggle(s)} className={`${chipClass} cursor-pointer transition-all ${active ? "ring-2 ring-brand-400 ring-offset-1" : "hover:scale-105"}`}>
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TeammateCard({ profile }: { profile: Profile }) {
  const availColor = { available: "bg-accent-500", busy: "bg-amber-500", unavailable: "bg-ink-300" }[profile.availability];
  return (
    <Link to={`/app/profile/${profile.username}`} className="card-hover group p-5">
      <div className="flex items-start gap-3">
        <Avatar name={profile.full_name} src={profile.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink-900 group-hover:text-brand-700">{profile.full_name}</h3>
          {profile.headline && <p className="truncate text-sm text-ink-500">{profile.headline}</p>}
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-400">
            <span className={`h-2 w-2 rounded-full ${availColor}`} />
            {AVAILABILITY_LABELS[profile.availability]}
          </div>
        </div>
      </div>
      {profile.bio && <p className="mt-3 line-clamp-2 text-sm text-ink-600">{truncate(profile.bio, 120)}</p>}
      <div className="mt-3 flex flex-wrap gap-1">
        {profile.skills.slice(0, 4).map((s) => <span key={s} className="chip-skill">{s}</span>)}
        {profile.skills.length > 4 && <span className="chip-neutral">+{profile.skills.length - 4}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-100 pt-3 text-xs text-ink-400">
        {profile.university && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.university}</span>}
        {profile.github_username && <span className="flex items-center gap-1"><Github className="h-3 w-3" />{profile.github_username}</span>}
      </div>
    </Link>
  );
}
