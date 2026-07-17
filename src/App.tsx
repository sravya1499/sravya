import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CompleteProfile from "./pages/CompleteProfile";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Explore from "./pages/Explore";
import ExploreTeammates from "./pages/ExploreTeammates";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import TeamWorkspace from "./pages/TeamWorkspace";
import Profile from "./pages/Profile";
import MyRequests from "./pages/MyRequests";
import Admin from "./pages/Admin";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function FullLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <span className="text-sm text-ink-500">Loading…</span>
      </div>
    </div>
  );
}

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <FullLoader />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Authenticated but profile not yet completed
  if (user && profile && !profile.full_name) {
    return (
      <Routes>
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="*" element={<Navigate to="/complete-profile" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/complete-profile" element={<Navigate to="/app" replace />} />
      <Route
        path="/app"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="explore" element={<Explore />} />
        <Route path="teammates" element={<ExploreTeammates />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="team/:id" element={<TeamWorkspace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="profile/:username" element={<Profile />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="notifications" element={<NotificationsPage />} />
        {profile?.role === "admin" && <Route path="admin" element={<Admin />} />}
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
