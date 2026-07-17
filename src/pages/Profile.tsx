import { useEffect, useState, FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CreditCard as Edit3, MapPin, GraduationCap, Github, Mail, Save, X, Briefcase, Award, Calendar, ArrowLeft, MessageSquare, Flag } from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  fetchProfile, fetchProfileByUsername, updateProfile, fetchProjects,
} from "../lib/api";
import { Profile as ProfileT, Project, ProjectExperience, Availability } from "../lib/types";
import { AVAILABILITY_LABELS } from "../lib/types";
import { SUGGESTED_SKILLS, SUGGESTED_DOMAINS, SUGGESTED_INTERESTS } from "../lib/types";
import { timeAgo } from "../lib/utils";
import Avatar from "../components/Avatar";
import TagInput from "../components/TagInput";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { InlineLoader } from "../components/Spinner";
import { useToast } from "../components/Toast";
import { StatusBadge } from "./Dashboard";
import { ReportModal } from "./ProjectDetail";

export default function ProfilePage() {
  const { username } = useParams();
  const { profile: me, refreshProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileT | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let p: ProfileT | null = null;
        if (username) p = await fetchProfileByUsername(username);
        else if (me) p = me;
        setProfile(p);
        if (p) {
          const all = await fetchProjects({ limit: 100 });
          setProjects(all.filter((pr) => pr.created_by === p!.id || pr.members?.some((m) => m.user_id === p!.id)));
        }
      } finally { setLoading(false); }
    })();
  }, [username, me]);

  if (loading) return <InlineLoader label="Loading profile…" />;
  if (!profile) return <EmptyState icon={Edit3} title="Profile not found" action={<Link to="/app/explore" className="btn-primary">Back</Link>} />;

  const isMe = me?.id === profile.id;
  const availColor = { available: "bg-accent-500", busy: "bg-amber-500", unavailable: "bg-ink-300" }[profile.availability];

  return (
    <div className="space-y-6">
      {username && (
        <Link to="/app/explore" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      )}

      {/* Profile header */}
      <div className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-600 via-brand-700 to-accent-600" />
        <div className="px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-12 flex items-end gap-4">
              <Avatar name={profile.full_name} src={profile.avatar_url} size="xl" className="ring-4 ring-white" />
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-ink-900">{profile.full_name}</h1>
                  <span className={`flex items-center gap-1 text-xs font-medium ${profile.availability === "available" ? "text-accent-600" : "text-ink-500"}`}>
                    <span className={`h-2 w-2 rounded-full ${availColor}`} />
                    {AVAILABILITY_LABELS[profile.availability]}
                  </span>
                </div>
                {profile.headline && <p className="mt-0.5 text-sm text-ink-600">{profile.headline}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                  {profile.university && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {profile.university}</span>}
                  {profile.major && <span>{profile.major}</span>}
                  {profile.graduation_year && <span>Class of {profile.graduation_year}</span>}
                  {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.location}</span>}
                  {profile.github_username && (
                    <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-ink-600 hover:text-brand-700">
                      <Github className="h-3.5 w-3.5" /> {profile.github_username}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isMe ? (
                <button onClick={() => setEditOpen(true)} className="btn-secondary"><Edit3 className="h-4 w-4" /> Edit profile</button>
              ) : (
                <>
                  {projects.length > 0 && <Link to={`/app/team/${projects[0].id}`} className="btn-secondary"><MessageSquare className="h-4 w-4" /> Message</Link>}
                  <button onClick={() => setReportOpen(true)} className="btn-ghost"><Flag className="h-4 w-4" /> Report</button>
                </>
              )}
            </div>
          </div>

          {profile.bio && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-700">{profile.bio}</p>}

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <SkillGroup label="Skills" items={profile.skills} chipClass="chip-skill" />
            <SkillGroup label="Domains" items={profile.domains} chipClass="chip-domain" />
            <SkillGroup label="Interests" items={profile.interests} chipClass="chip-neutral" />
          </div>
        </div>
      </div>

      {/* Experience */}
      {profile.project_experience && profile.project_experience.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Project experience</h2>
          <div className="space-y-4">
            {profile.project_experience.map((exp, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink-900">{exp.title}</h3>
                    <span className="text-xs text-ink-400">{exp.year}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-600">{exp.description}</p>
                  {exp.tech?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {exp.tech.map((t) => <span key={t} className="chip-skill px-1.5 py-0 text-[10px]">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Projects</h2>
        {projects.length === 0 ? (
          <EmptyState icon={Award} title="No projects yet" description={isMe ? "Join or create a project to see it here." : "This student hasn't joined any projects yet."} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <Link key={p.id} to={me && p.members?.some((m) => m.user_id === me.id) ? `/app/team/${p.id}` : `/app/projects/${p.id}`} className="card-hover p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-ink-900">{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">{p.description}</p>
                <p className="mt-2 text-xs text-ink-400">Joined {timeAgo(p.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isMe && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profile={profile}
          onSave={async (patch) => {
            try {
              await updateProfile(profile.id, patch);
              await refreshProfile();
              setProfile({ ...profile, ...patch });
              toast({ type: "success", message: "Profile updated" });
              setEditOpen(false);
            } catch (e: any) { toast({ type: "error", message: e.message }); }
          }}
        />
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={async (reason) => {
        if (!me) return;
        try {
          await import("../lib/api").then(m => m.createReport({ target_type: "profile", target_id: profile.id, reason }));
          toast({ type: "success", message: "Report submitted" }); setReportOpen(false);
        } catch (e: any) { toast({ type: "error", message: e.message }); }
      }} />
    </div>
  );
}

function SkillGroup({ label, items, chipClass }: { label: string; items: string[]; chipClass: string }) {
  return (
    <div>
      <h3 className="label">{label}</h3>
      {items.length === 0 ? <p className="text-sm text-ink-400">None listed</p> : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => <span key={s} className={chipClass}>{s}</span>)}
        </div>
      )}
    </div>
  );
}

function EditProfileModal({ open, onClose, profile, onSave }: { open: boolean; onClose: () => void; profile: ProfileT; onSave: (p: Partial<ProfileT>) => void }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [headline, setHeadline] = useState(profile.headline || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [university, setUniversity] = useState(profile.university || "");
  const [major, setMajor] = useState(profile.major || "");
  const [gradYear, setGradYear] = useState(profile.graduation_year?.toString() || "");
  const [location, setLocation] = useState(profile.location || "");
  const [github, setGithub] = useState(profile.github_username || "");
  const [availability, setAvailability] = useState<Availability>(profile.availability);
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [domains, setDomains] = useState<string[]>(profile.domains || []);
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [experience, setExperience] = useState<ProjectExperience[]>(profile.project_experience || []);
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    onSave({
      full_name: fullName, headline, bio, university, major,
      graduation_year: gradYear ? parseInt(gradYear) : null,
      location, github_username: github || null, availability,
      skills, domains, interests, project_experience: experience,
    });
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile" size="lg" footer={
      <>
        <button onClick={onClose} className="btn-secondary"><X className="h-4 w-4" /> Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}</button>
      </>
    }>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Full name</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><label className="label">Headline</label><input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
          <div><label className="label">University</label><input className="input" value={university} onChange={(e) => setUniversity(e.target.value)} /></div>
          <div><label className="label">Major</label><input className="input" value={major} onChange={(e) => setMajor(e.target.value)} /></div>
          <div><label className="label">Graduation year</label><input className="input" type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)} /></div>
          <div><label className="label">Location</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div><label className="label">GitHub username</label><input className="input" value={github} onChange={(e) => setGithub(e.target.value)} /></div>
          <div>
            <label className="label">Availability</label>
            <select className="input" value={availability} onChange={(e) => setAvailability(e.target.value as Availability)}>
              {Object.entries(AVAILABILITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input min-h-[80px] resize-y" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} />
        </div>
        <TagInput label="Skills" values={skills} onChange={setSkills} suggestions={SUGGESTED_SKILLS} chipClass="chip-skill" />
        <TagInput label="Domains" values={domains} onChange={setDomains} suggestions={SUGGESTED_DOMAINS} chipClass="chip-domain" />
        <TagInput label="Interests" values={interests} onChange={setInterests} suggestions={SUGGESTED_INTERESTS} chipClass="chip-neutral" />

        {/* Experience editor */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Project experience</label>
            <button type="button" onClick={() => setExperience([...experience, { title: "", description: "", tech: [], year: "" }])} className="text-sm font-semibold text-brand-600 hover:text-brand-700">+ Add</button>
          </div>
          <div className="space-y-3">
            {experience.map((exp, i) => (
              <div key={i} className="rounded-lg border border-ink-200 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="input" placeholder="Title" value={exp.title} onChange={(e) => { const n = [...experience]; n[i] = { ...exp, title: e.target.value }; setExperience(n); }} />
                  <input className="input" placeholder="Year" value={exp.year} onChange={(e) => { const n = [...experience]; n[i] = { ...exp, year: e.target.value }; setExperience(n); }} />
                </div>
                <textarea className="input mt-2 min-h-[50px]" placeholder="Description" value={exp.description} onChange={(e) => { const n = [...experience]; n[i] = { ...exp, description: e.target.value }; setExperience(n); }} />
                <div className="mt-2 flex items-center justify-between">
                  <input className="input flex-1" placeholder="Tech (comma separated)" value={exp.tech.join(", ")} onChange={(e) => { const n = [...experience]; n[i] = { ...exp, tech: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }; setExperience(n); }} />
                  <button type="button" onClick={() => setExperience(experience.filter((_, idx) => idx !== i))} className="ml-2 text-rose-500 hover:text-rose-700"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {experience.length === 0 && <p className="text-xs text-ink-400">No experience added.</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
