import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-4">
      <div className="glass-panel max-w-md w-full p-8 text-center">
        <div className="text-6xl font-bold text-primary-200 mb-4">404</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Page Not Found
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          The page you are looking for does not exist.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <Home className="w-4 h-4" />
          Back to Interpreter
        </Link>
      </div>
    </div>
  );
}
