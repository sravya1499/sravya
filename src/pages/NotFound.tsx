import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <div className="font-display text-7xl font-bold text-ink-200">404</div>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 text-sm text-ink-500">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/app" className="btn-primary mt-6">
        <Compass className="h-4 w-4" /> Back to dashboard
      </Link>
    </div>
  );
}
