import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type Mode = "signin" | "signup";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <span className="text-3xl">🐾</span>
          <h1 className="text-xl font-bold mt-2">PawScheduler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "signin" ? "Sign in to your account" : "Create a client account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          {mode === "signin" ? (
            <>
              New client?{" "}
              <button
                className="text-brand-600 underline"
                onClick={() => setMode("signup")}
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="text-brand-600 underline"
                onClick={() => setMode("signin")}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link
            to="/embed"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            View sitter availability without an account →
          </Link>
        </div>
      </div>
    </div>
  );
}
