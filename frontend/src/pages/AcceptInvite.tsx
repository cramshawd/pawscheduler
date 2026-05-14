import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

type Step = "auth" | "profile";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { signIn, signUp, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(user ? "profile" : "auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isNew) await signUp(email, password);
      else await signIn(email, password);
      setStep("profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/invites/accept/${token}`, { name, email, phone, bio });
      await refreshProfile();
      navigate("/sitter");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <span className="text-3xl">🐾</span>
          <h1 className="text-xl font-bold mt-2">You're invited!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set up your sitter account to manage your calendar.
          </p>
        </div>

        {step === "auth" && (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
              <button
                type="button"
                onClick={() => setIsNew(true)}
                className={`flex-1 py-2 ${isNew ? "bg-brand-500 text-white" : "bg-white text-gray-600"}`}
              >
                New account
              </button>
              <button
                type="button"
                onClick={() => setIsNew(false)}
                className={`flex-1 py-2 ${!isNew ? "bg-brand-500 text-white" : "bg-white text-gray-600"}`}
              >
                Existing account
              </button>
            </div>
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
              {loading ? "…" : "Continue"}
            </button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={handleProfile} className="space-y-4">
            <input
              type="text"
              placeholder="Full name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Short bio (shown to clients)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? "Setting up…" : "Finish Setup"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
