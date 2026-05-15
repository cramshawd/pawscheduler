import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type Role = "choose" | "client" | "sitter";
type Mode = "signin" | "signup";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("choose");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  function selectRole(r: Role) {
    setRole(r);
    setMode("signin");
    setEmail("");
    setPassword("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        navigate("/");
      } else {
        await signUp(email, password);
        setSignedUp(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Email confirmation screen ─────────────────────────────────────────────
  if (signedUp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">📬</div>
          <h2 className="text-lg font-semibold mb-2">Check your email</h2>
          <p className="text-sm text-gray-500">
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account, then{" "}
            <button
              className="text-brand-600 underline"
              onClick={() => { setMode("signin"); setSignedUp(false); }}
            >
              sign in
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  // ── Role chooser ──────────────────────────────────────────────────────────
  if (role === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 max-w-sm w-full">
          <div className="text-center mb-8">
            <span className="text-4xl">🐾</span>
            <h1 className="text-2xl font-bold mt-3">PawScheduler</h1>
            <p className="text-sm text-gray-500 mt-1">Who are you signing in as?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => selectRole("client")}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-200 p-4 text-left hover:border-brand-400 hover:bg-brand-50 transition-all group"
            >
              <span className="text-3xl">🏠</span>
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-brand-700">Pet Owner</p>
                <p className="text-xs text-gray-500 mt-0.5">Browse sitters and submit booking requests</p>
              </div>
            </button>

            <button
              onClick={() => selectRole("sitter")}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-200 p-4 text-left hover:border-brand-400 hover:bg-brand-50 transition-all group"
            >
              <span className="text-3xl">🐕</span>
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-brand-700">Dog Sitter</p>
                <p className="text-xs text-gray-500 mt-0.5">Manage your calendar and booking requests</p>
              </div>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <Link to="/embed" className="text-xs text-gray-400 hover:text-gray-600">
              Browse availability without signing in →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Auth form (client or sitter) ──────────────────────────────────────────
  const isClient = role === "client";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => selectRole("choose")}
            className="text-gray-400 hover:text-gray-600 text-sm"
            aria-label="Back"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              {isClient ? "🏠 Pet Owner" : "🐕 Dog Sitter"}
            </h1>
            <p className="text-xs text-gray-500">
              {isClient
                ? mode === "signin" ? "Sign in to manage your bookings" : "Create your free account"
                : "Sign in to your sitter account"}
            </p>
          </div>
        </div>

        {/* Client mode toggle */}
        {isClient && (
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm mb-4">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 font-medium transition-colors ${
                mode === "signin" ? "bg-brand-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 font-medium transition-colors ${
                mode === "signup" ? "bg-brand-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Sitter invite notice */}
        {!isClient && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-xs text-amber-700">
            New sitters join by invitation. If you received an invite link, use that to create your account.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Sitter: link to invite flow */}
        {!isClient && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Don't have an account?{" "}
            <span className="text-gray-500">Check your invite email for a sign-up link.</span>
          </p>
        )}
      </div>
    </div>
  );
}
