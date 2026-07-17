import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, fetchProjects } from "../lib/api";
import { useToast } from "./Toast";
import Modal from "./Modal";
import TagInput from "./TagInput";
import Spinner from "./Spinner";
import { SUGGESTED_SKILLS, SUGGESTED_DOMAINS } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamSize, setTeamSize] = useState(4);
  const [deadline, setDeadline] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const reset = () => {
    setTitle(""); setDescription(""); setTeamSize(4); setDeadline("");
    setSkills([]); setDomains([]); setGithubUrl("");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ type: "error", message: "Please add a project title." });
      return;
    }
    setSaving(true);
    try {
      const p = await createProject({
        title: title.trim(),
        description: description.trim(),
        required_skills: skills,
        domains,
        team_size: teamSize,
        deadline: deadline || null,
        github_repo_url: githubUrl || null,
      });
      toast({ type: "success", message: "Project created! You're the owner." });
      reset();
      onClose();
      onCreated?.();
      navigate(`/app/team/${p.id}`);
    } catch (err: any) {
      toast({ type: "error", message: err.message ?? "Failed to create project" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post a project idea"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onSubmit} disabled={saving} className="btn-primary">
            {saving && <Spinner className="text-white" />}
            {saving ? "Creating…" : "Create project"}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Project title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AI-powered study planner" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[100px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is the project? What problem does it solve? What will the team build?" maxLength={1000} />
          <p className="mt-1 text-right text-xs text-ink-400">{description.length}/1000</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Team size</label>
            <select className="input" value={teamSize} onChange={(e) => setTeamSize(parseInt(e.target.value))}>
              {[2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                <option key={n} value={n}>{n} members</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Deadline</label>
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <TagInput label="Required skills" values={skills} onChange={setSkills} suggestions={SUGGESTED_SKILLS} placeholder="e.g. React, Python…" chipClass="chip-skill" />
        <TagInput label="Domains" values={domains} onChange={setDomains} suggestions={SUGGESTED_DOMAINS} placeholder="e.g. AI/ML, Web Development…" chipClass="chip-domain" />
        <div>
          <label className="label">GitHub repo URL (optional)</label>
          <input className="input" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/org/repo" />
          <p className="mt-1 text-xs text-ink-400">You can also connect a repo later from the team workspace.</p>
        </div>
      </form>
    </Modal>
  );
}
