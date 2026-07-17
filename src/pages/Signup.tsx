import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import { AuthShell } from "./Login";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, username } },
    });
    setLoading(false);
    if (error) {
      toast({ type: "error", message: error.message });
      return;
    }
    if (!data.session) {
      toast({ type: "success", message: "Account created! Please sign in." });
      navigate("/login");
      return;
    }
    toast({ type: "success", message: "Account created!" });
    navigate("/complete-profile");
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join the student collaboration platform and start building."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input pl-10"
              placeholder="Ada Lovelace"
            />
          </div>
        </div>
        <div>
          <label className="label">Username</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
            className="input"
            placeholder="adalovelace"
          />
        </div>
        <div>
          <label className="label">University email</label>
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
              placeholder="At least 6 characters"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account…" : "Create account"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
