import { supabase } from "./supabase";
import type {
  Project, ProjectMember, JoinRequest, Task, Message, Notification,
  GithubRepo, GithubCommit, Profile, ProjectExperience,
} from "./types";

// ---------- Profiles ----------

export async function fetchProfile(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(id: string, patch: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function searchProfiles(opts: {
  query?: string;
  skills?: string[];
  domains?: string[];
  availability?: string;
  limit?: number;
}) {
  let q = supabase.from("profiles").select("*");
  if (opts.query) q = q.or(`full_name.ilike.%${opts.query}%,headline.ilike.%${opts.query}%,bio.ilike.%${opts.query}%`);
  if (opts.availability && opts.availability !== "all") q = q.eq("availability", opts.availability);
  if (opts.skills && opts.skills.length) q = q.overlaps("skills", opts.skills);
  if (opts.domains && opts.domains.length) q = q.overlaps("domains", opts.domains);
  q = q.order("created_at", { ascending: false }).limit(opts.limit ?? 24);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Profile[];
}

// ---------- Projects ----------

const PROJECT_SELECT = `
  *,
  creator:profiles!projects_created_by_fkey(id, full_name, username, avatar_url, headline, availability, skills, domains, university, major),
  members:project_members(id, project_id, user_id, role, joined_at, profile:profiles!project_members_user_id_fkey(id, full_name, username, avatar_url, headline, availability))
`;

export async function fetchProjects(opts: {
  query?: string;
  skills?: string[];
  domains?: string[];
  status?: string;
  limit?: number;
} = {}) {
  let q = supabase.from("projects").select(PROJECT_SELECT);
  if (opts.query) q = q.or(`title.ilike.%${opts.query}%,description.ilike.%${opts.query}%`);
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.skills && opts.skills.length) q = q.overlaps("required_skills", opts.skills);
  if (opts.domains && opts.domains.length) q = q.overlaps("domains", opts.domains);
  q = q.order("created_at", { ascending: false }).limit(opts.limit ?? 30);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as Project[];
}

export async function fetchProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Project | null;
}

export async function createProject(input: {
  title: string;
  description: string;
  required_skills: string[];
  domains: string[];
  team_size: number;
  deadline: string | null;
  github_repo_url?: string | null;
}) {
  const { data, error } = await supabase
    .from("projects")
    .insert(input)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  const project = data as Project;

  // add owner as member with role owner
  await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: project.created_by,
    role: "owner",
  });

  return project;
}

export async function updateProject(id: string, patch: Partial<Project>) {
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as Project | null;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Members ----------

export async function fetchMembers(projectId: string) {
  const { data, error } = await supabase
    .from("project_members")
    .select("*, profile:profiles!project_members_user_id_fkey(*)")
    .eq("project_id", projectId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as ProjectMember[];
}

export async function updateMemberRole(projectId: string, userId: string, role: string) {
  const { error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeMember(projectId: string, userId: string) {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------- Join requests ----------

export async function fetchRequestsForProject(projectId: string) {
  const { data, error } = await supabase
    .from("join_requests")
    .select("*, profile:profiles!join_requests_user_id_fkey(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as JoinRequest[];
}

export async function fetchMyRequests(userId: string) {
  const { data, error } = await supabase
    .from("join_requests")
    .select("*, project:projects!join_requests_project_id_fkey(id, title, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as JoinRequest[];
}

export async function createJoinRequest(projectId: string, userId: string, message: string) {
  const { data, error } = await supabase
    .from("join_requests")
    .insert({ project_id: projectId, user_id: userId, message })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function decideJoinRequest(
  requestId: string,
  status: "accepted" | "rejected",
  projectId: string,
  userId: string,
) {
  const { error } = await supabase
    .from("join_requests")
    .update({ status, decided_at: new Date().toISOString(), decided_by: (await supabase.auth.getUser()).data.user?.id })
    .eq("id", requestId);
  if (error) throw error;

  if (status === "accepted") {
    await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: userId,
      role: "member",
    });
  }
}

export async function cancelJoinRequest(requestId: string) {
  const { error } = await supabase.from("join_requests").delete().eq("id", requestId);
  if (error) throw error;
}

// ---------- Tasks ----------

export async function fetchTasks(projectId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, username, avatar_url)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as Task[];
}

export async function createTask(input: {
  project_id: string;
  title: string;
  description?: string;
  priority?: string;
  due_date?: string | null;
  assigned_to?: string | null;
}) {
  const { data, error } = await supabase.from("tasks").insert(input).select("*").maybeSingle();
  if (error) throw error;
  return data as Task | null;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as Task | null;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Messages ----------

export async function fetchMessages(projectId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, username, avatar_url)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data || []) as unknown as Message[];
}

export async function sendMessage(projectId: string, content: string) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ project_id: projectId, content })
    .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, username, avatar_url)")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Message | null;
}

// ---------- Notifications ----------

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as Notification[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export async function pushNotification(input: {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, any>;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    payload: input.payload ?? {},
  });
  if (error) console.error("pushNotification", error);
}

// ---------- GitHub ----------

export async function fetchGithubRepo(projectId: string) {
  const { data, error } = await supabase
    .from("github_repos")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data as GithubRepo | null;
}

export async function fetchGithubCommits(repoId: string) {
  const { data, error } = await supabase
    .from("github_commits")
    .select("*")
    .eq("repo_id", repoId)
    .order("author_date", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data || []) as GithubCommit[];
}

export async function linkGithubRepo(projectId: string, repoFullName: string) {
  const repoUrl = `https://github.com/${repoFullName}`;
  const { data, error } = await supabase
    .from("github_repos")
    .upsert(
      { project_id: projectId, repo_full_name: repoFullName, repo_url: repoUrl },
      { onConflict: "project_id" },
    )
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as GithubRepo | null;
}

export async function unlinkGithubRepo(projectId: string) {
  const { error } = await supabase.from("github_repos").delete().eq("project_id", projectId);
  if (error) throw error;
}

export async function refreshGithubCommits(projectId: string) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-sync`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ project_id: projectId }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "Failed");
    throw new Error(`GitHub sync failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json as { commits: number; repo: string };
}

// ---------- Reports / Admin ----------

export async function createReport(input: {
  target_type: string;
  target_id: string;
  reason: string;
}) {
  const { data, error } = await supabase
    .from("reports")
    .insert(input as any)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchReports(status?: string) {
  let q = supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(id, full_name, username, avatar_url)")
    .order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function updateReport(id: string, status: string) {
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function adminFetchProfiles(limit = 100) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function adminSetUserRole(id: string, role: "student" | "admin") {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function adminFetchAllProjects(limit = 100) {
  const { data, error } = await supabase
    .from("projects")
    .select("*, creator:profiles!projects_created_by_fkey(full_name, username)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function adminUpdateProjectStatus(id: string, status: string) {
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) throw error;
}

// ---------- helpers ----------

export function projectExperienceToJson(value: ProjectExperience[]) {
  return JSON.parse(JSON.stringify(value)) as ProjectExperience[];
}
