import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RepoMeta {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
}

interface CommitItem {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: repoRow, error: repoErr } = await supabase
      .from("github_repos")
      .select("*")
      .eq("project_id", project_id)
      .maybeSingle();
    if (repoErr) throw repoErr;
    if (!repoRow) {
      return new Response(
        JSON.stringify({ error: "No GitHub repository linked to this project. Link a repo first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fullName = repoRow.repo_full_name;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "collabra-sync",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const ghToken = Deno.env.get("GITHUB_TOKEN");
    if (ghToken) headers.Authorization = `Bearer ${ghToken}`;

    // 1. repo metadata
    const repoRes = await fetch(`https://api.github.com/repos/${fullName}`, { headers });
    if (!repoRes.ok) {
      const body = await repoRes.text();
      return new Response(
        JSON.stringify({ error: `GitHub repo fetch failed: ${repoRes.status} ${body.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const repoMeta = (await repoRes.json()) as RepoMeta;

    const { error: repoUpdErr } = await supabase
      .from("github_repos")
      .update({
        description: repoMeta.description,
        stars: repoMeta.stargazers_count,
        forks: repoMeta.forks_count,
        default_branch: repoMeta.default_branch,
        last_fetched_at: new Date().toISOString(),
      })
      .eq("id", repoRow.id);
    if (repoUpdErr) throw repoUpdErr;

    // 2. recent commits (30)
    const commitsRes = await fetch(
      `https://api.github.com/repos/${fullName}/commits?per_page=30`,
      { headers },
    );
    if (!commitsRes.ok) {
      const body = await commitsRes.text();
      return new Response(
        JSON.stringify({ error: `GitHub commits fetch failed: ${commitsRes.status} ${body.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const commits = (await commitsRes.json()) as CommitItem[];

    // 3. clear old + insert new (atomic-ish). Service role bypasses RLS.
    await supabase.from("github_commits").delete().eq("repo_id", repoRow.id);

    const rows = commits.map((c) => ({
      repo_id: repoRow.id,
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name ?? null,
      author_date: c.commit.author?.date ?? null,
      url: c.html_url,
    }));

    let inserted = 0;
    if (rows.length) {
      const { data: ins, error: insErr } = await supabase
        .from("github_commits")
        .insert(rows)
        .select("id");
      if (insErr) throw insErr;
      inserted = ins?.length ?? 0;
    }

    return new Response(
      JSON.stringify({ commits: inserted, repo: repoMeta.full_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
