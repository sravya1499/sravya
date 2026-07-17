export type Availability = "available" | "busy" | "unavailable";
export type UserRole = "student" | "admin";
export type ProjectStatus = "recruiting" | "active" | "completed" | "cancelled";
export type MemberRole = "owner" | "lead" | "member";
export type RequestStatus = "pending" | "accepted" | "rejected";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type NotificationType =
  | "request"
  | "reply"
  | "deadline"
  | "update"
  | "report"
  | "message";
export type ReportTargetType = "project" | "profile" | "message";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  domains: string[];
  availability: Availability;
  github_username: string | null;
  project_experience: ProjectExperience[];
  role: UserRole;
  university: string | null;
  major: string | null;
  graduation_year: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectExperience {
  title: string;
  description: string;
  tech: string[];
  year: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  domains: string[];
  team_size: number;
  deadline: string | null;
  status: ProjectStatus;
  github_repo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined fields
  creator?: Profile;
  members?: ProjectMember[];
  member_count?: number;
  my_role?: MemberRole | null;
  my_request?: RequestStatus | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile: Profile;
}

export interface JoinRequest {
  id: string;
  project_id: string;
  user_id: string;
  message: string;
  status: RequestStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  profile: Profile;
  project?: Project;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface GithubRepo {
  id: string;
  project_id: string;
  repo_full_name: string;
  repo_url: string;
  description: string | null;
  stars: number;
  forks: number;
  default_branch: string | null;
  last_fetched_at: string;
}

export interface GithubCommit {
  id: string;
  repo_id: string;
  sha: string;
  message: string;
  author: string | null;
  author_date: string | null;
  url: string | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  reporter?: Profile;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  recruiting: "Recruiting",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: "Available",
  busy: "Busy",
  unavailable: "Unavailable",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  lead: "Team Lead",
  member: "Member",
};

export const SUGGESTED_SKILLS = [
  "React", "TypeScript", "Node.js", "Python", "Java", "C++", "Go",
  "TensorFlow", "PyTorch", "UI/UX Design", "Figma", "Product Management",
  "Data Analysis", "Machine Learning", "DevOps", "Docker", "AWS",
  "MongoDB", "PostgreSQL", "GraphQL", "Swift", "Kotlin", "Flutter",
];

export const SUGGESTED_DOMAINS = [
  "Web Development", "Mobile", "AI/ML", "Data Science", "Cybersecurity",
  "Cloud", "IoT", "Game Development", "Blockchain", "AR/VR",
  "Bioinformatics", "EdTech", "FinTech", "HealthTech", "Robotics",
];

export const SUGGESTED_INTERESTS = [
  "Open Source", "Hackathons", "Research", "Startups", "Competitive Programming",
  "Design Systems", "Accessibility", "Sustainability", "EdTech", "Web3",
];
