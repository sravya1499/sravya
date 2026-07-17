import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";
import { updateProfile } from "../lib/api";
import { useToast } from "../components/Toast";
import TagInput from "../components/TagInput";
import {
  SUGGESTED_SKILLS, SUGGESTED_DOMAINS, SUGGESTED_INTERESTS, Availability,
} from "../lib/types";

const AVAILABILITY_OPTIONS: { value: Availability; label: string; desc: string }[] = [
  { value: "available", label: "Available", desc: "Open to new projects and teammates" },
  { value: "busy", label: "Busy", desc: "Currently engaged, limited availability" },
  { value: "unavailable", label: "Unavailable", desc: "Not looking for projects right now" },
];

export default function CompleteProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || "");
  const [username, setUsername] = useState(profile?.username || user?.user_metadata?.username || "");
  const [headline, setHeadline] = useState(profile?.headline || "");
  const [university, setUniversity] = useState(profile?.university || "");
  const [major, setMajor] = useState(profile?.major || "");
  const [gradYear, setGradYear] = useState(profile?.graduation_year?.toString() || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [github, setGithub] = useState(profile?.github_username || "");
  const [availability, setAvailability] = useState<Availability>(profile?.availability || "available");
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [domains, setDomains] = useState<string[]>(profile?.domains || []);
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: fullName,
        username: username || null,
        headline,
        university,
        major,
        graduation_year: gradYear ? parseInt(gradYear) : null,
        location,
        bio,
        github_username: github || null,
        availability,
        skills,
        domains,
        interests,
      });
      await refreshProfile();
      toast({ type: "success", message: "Profile complete! Welcome to Collabra." });
      navigate("/app");
    } catch (err: any) {
      toast({ type: "error", message: err.message ?? "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold text-ink-900">Collabra</span>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-900">Complete your profile</h1>
          <p className="mt-2 text-ink-500">
            Tell the community about your skills and interests so teammates can find you.
            You can edit everything later.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full name</label>
                <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="label">Username</label>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                  placeholder="adalovelace"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Headline</label>
                <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="CS senior passionate about AI & systems" />
              </div>
              <div>
                <label className="label">University</label>
                <input className="input" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Stanford University" />
              </div>
              <div>
                <label className="label">Major</label>
                <input className="input" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Computer Science" />
              </div>
              <div>
                <label className="label">Graduation year</label>
                <input className="input" type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="2026" />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" />
              </div>
              <div>
                <label className="label">GitHub username</label>
                <input className="input" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="octocat" />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Bio</label>
              <textarea
                className="input min-h-[90px] resize-y"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short intro about you, what you're working on, and what excites you…"
                maxLength={600}
              />
              <p className="mt-1 text-right text-xs text-ink-400">{bio.length}/600</p>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Availability</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {AVAILABILITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAvailability(o.value)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    availability === o.value
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                      : "border-ink-200 bg-white hover:border-ink-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${availability === o.value ? "bg-brand-600" : "bg-ink-300"}`} />
                    <span className="font-semibold text-ink-900">{o.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{o.desc}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-6 space-y-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Skills & interests</h2>
            <TagInput label="Skills" values={skills} onChange={setSkills} suggestions={SUGGESTED_SKILLS} placeholder="e.g. React, Python, Figma…" chipClass="chip-skill" />
            <TagInput label="Domains / fields" values={domains} onChange={setDomains} suggestions={SUGGESTED_DOMAINS} placeholder="e.g. AI/ML, Web Development…" chipClass="chip-domain" />
            <TagInput label="Interests" values={interests} onChange={setInterests} suggestions={SUGGESTED_INTERESTS} placeholder="e.g. Open Source, Hackathons…" chipClass="chip-neutral" />
          </section>

          <div className="flex items-center justify-end gap-3 pb-10">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Finish & continue"}
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
