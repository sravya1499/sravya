/*
# Student Project Collaboration Platform - Initial Schema

## Overview
Creates the full data model for a MERN-style student collaboration platform
adapted to Supabase (Postgres + Auth + Realtime). Covers student profiles,
project ideas, team membership, join requests, tasks, team chat, notifications,
GitHub repository/commit tracking, and admin moderation (reports).

## Tables
1. profiles - one row per auth user; skills, interests, domains, availability,
   github_username, project_experience (jsonb), role (student/admin).
2. projects - project idea with required_skills, domains, team_size, deadline,
   status, github_repo_url, created_by.
3. project_members - membership with role (owner/lead/member).
4. join_requests - pending/accepted/rejected join requests.
5. tasks - project tasks with status, priority, due_date, assigned_to.
6. messages - realtime team chat scoped to project_id.
7. notifications - per-user notifications with type + payload.
8. github_repos - cached repo metadata linked to a project.
9. github_commits - cached commits for a linked repo.
10. reports - admin moderation reports.

## Security
- RLS enabled on every table.
- profiles: authenticated read all; update own.
- projects: read all; owner insert/update/delete.
- project_members: read all; insert by owner or self; update/delete by owner.
- join_requests: read by owner or requester; insert by requester; update by owner.
- tasks: read by members; insert/delete by leads; update by members.
- messages: read/insert by members.
- notifications: read/update/delete own; insert by any authenticated.
- github_repos/commits: read all; write by project owner.
- reports: read by admin or reporter; insert by reporter; update by admin.

## Realtime
messages, notifications, tasks, join_requests, project_members, projects
added to supabase_realtime publication.

## Notes
- Owner columns default to auth.uid().
- is_admin() helper for admin checks.
- handle_new_user() trigger auto-creates a profile row on signup.
*/

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE availability_status AS ENUM ('available', 'busy', 'unavailable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('recruiting', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'lead', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('request', 'reply', 'deadline', 'update', 'report', 'message');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_target_type AS ENUM ('project', 'profile', 'message');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  username text UNIQUE,
  avatar_url text,
  headline text DEFAULT '',
  bio text DEFAULT '',
  skills text[] DEFAULT '{}',
  interests text[] DEFAULT '{}',
  domains text[] DEFAULT '{}',
  availability availability_status DEFAULT 'available',
  github_username text,
  project_experience jsonb DEFAULT '[]'::jsonb,
  role user_role DEFAULT 'student',
  university text DEFAULT '',
  major text DEFAULT '',
  graduation_year int,
  location text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  required_skills text[] DEFAULT '{}',
  domains text[] DEFAULT '{}',
  team_size int NOT NULL DEFAULT 4 CHECK (team_size > 0 AND team_size <= 20),
  deadline date,
  status project_status DEFAULT 'recruiting',
  github_repo_url text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_all" ON projects;
CREATE POLICY "projects_select_all" ON projects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "projects_insert_owner" ON projects;
CREATE POLICY "projects_insert_owner" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "projects_update_owner" ON projects;
CREATE POLICY "projects_update_owner" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "projects_delete_owner" ON projects;
CREATE POLICY "projects_delete_owner" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select_project" ON project_members;
CREATE POLICY "members_select_project" ON project_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "members_insert_owner_or_self" ON project_members;
CREATE POLICY "members_insert_owner_or_self" ON project_members FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members_update_owner" ON project_members;
CREATE POLICY "members_update_owner" ON project_members FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "members_delete_owner_or_self" ON project_members;
CREATE POLICY "members_delete_owner_or_self" ON project_members FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.created_by = auth.uid())
  );

-- ============================================================
-- JOIN REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  message text DEFAULT '',
  status request_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select_involved" ON join_requests;
CREATE POLICY "requests_select_involved" ON join_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = join_requests.project_id AND p.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "requests_insert_self" ON join_requests;
CREATE POLICY "requests_insert_self" ON join_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "requests_update_owner" ON join_requests;
CREATE POLICY "requests_update_owner" ON join_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = join_requests.project_id AND p.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = join_requests.project_id AND p.created_by = auth.uid())
  );

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  due_date date,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_members" ON tasks;
CREATE POLICY "tasks_select_members" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_insert_leads" ON tasks;
CREATE POLICY "tasks_insert_leads" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() AND pm.role IN ('owner','lead'))
  );

DROP POLICY IF EXISTS "tasks_update_members" ON tasks;
CREATE POLICY "tasks_update_members" ON tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_delete_leads" ON tasks;
CREATE POLICY "tasks_delete_leads" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() AND pm.role IN ('owner','lead'))
  );

-- ============================================================
-- MESSAGES (realtime team chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_members" ON messages;
CREATE POLICY "messages_select_members" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = messages.project_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages_insert_members" ON messages;
CREATE POLICY "messages_insert_members" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = messages.project_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages_delete_sender_or_owner" ON messages;
CREATE POLICY "messages_delete_sender_or_owner" ON messages FOR DELETE
  TO authenticated USING (
    auth.uid() = sender_id
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = messages.project_id AND p.created_by = auth.uid())
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL DEFAULT '',
  body text DEFAULT '',
  payload jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- GITHUB REPOS + COMMITS
-- ============================================================
CREATE TABLE IF NOT EXISTS github_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  repo_full_name text NOT NULL,
  repo_url text NOT NULL,
  description text,
  stars int DEFAULT 0,
  forks int DEFAULT 0,
  default_branch text,
  last_fetched_at timestamptz DEFAULT now()
);
ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repos_select_all" ON github_repos;
CREATE POLICY "repos_select_all" ON github_repos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "repos_insert_owner" ON github_repos;
CREATE POLICY "repos_insert_owner" ON github_repos FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = github_repos.project_id AND p.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "repos_update_owner" ON github_repos;
CREATE POLICY "repos_update_owner" ON github_repos FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = github_repos.project_id AND p.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = github_repos.project_id AND p.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "repos_delete_owner" ON github_repos;
CREATE POLICY "repos_delete_owner" ON github_repos FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = github_repos.project_id AND p.created_by = auth.uid())
  );

CREATE TABLE IF NOT EXISTS github_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  sha text NOT NULL,
  message text NOT NULL,
  author text,
  author_date timestamptz,
  url text,
  UNIQUE (repo_id, sha)
);
ALTER TABLE github_commits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commits_select_all" ON github_commits;
CREATE POLICY "commits_select_all" ON github_commits FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "commits_insert_owner" ON github_commits;
CREATE POLICY "commits_insert_owner" ON github_commits FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM github_repos r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = github_commits.repo_id AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "commits_delete_owner" ON github_commits;
CREATE POLICY "commits_delete_owner" ON github_commits FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM github_repos r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = github_commits.repo_id AND p.created_by = auth.uid()
    )
  );

-- ============================================================
-- REPORTS (admin moderation)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  target_type report_target_type NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status report_status DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

DROP POLICY IF EXISTS "reports_select_admin_or_reporter" ON reports;
CREATE POLICY "reports_select_admin_or_reporter" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "reports_insert_any" ON reports;
CREATE POLICY "reports_insert_any" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE
  TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_project ON join_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_requests_user ON join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE join_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE projects;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
