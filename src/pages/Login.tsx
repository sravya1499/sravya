import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ type: "error", message: error.message });
      return;
    }
    toast({ type: "success", message: "Welcome back!" });
    navigate("/app");
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue collaborating on student projects."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="you@university.edu"
            />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-ink-50">
      <div className="flex w-full flex-col lg:flex-row">
        <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 lg:flex">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative z-10 flex flex-col justify-between p-12 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold">Collabra</span>
            </div>
            <div>
              <h2 className="font-display text-4xl font-bold leading-tight">
                Build something great,<br />together.
              </h2>
              <p className="mt-4 max-w-md text-brand-100">
                Find teammates with the right skills, post project ideas, manage tasks,
                chat in real time, and connect your GitHub repos — all in one place.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                <Stat label="Projects" value="1.2k+" />
                <Stat label="Students" value="8.5k+" />
                <Stat label="Teams formed" value="940+" />
              </div>
            </div>
            <p className="text-sm text-brand-200">Trusted by students at 200+ universities</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="font-display text-xl font-bold text-ink-900">Collabra</span>
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">{title}</h1>
            <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-brand-200">{label}</div>
    </div>
  );
}
