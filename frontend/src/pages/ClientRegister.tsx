import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function ClientRegister() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/clients/", form);
      await refreshProfile();
      navigate("/client");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">Set up your client profile</h1>
      <p className="text-gray-500 text-sm mb-6">
        This lets sitters know who you are and how to reach you.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <input
          name="name"
          placeholder="Full name *"
          value={form.name}
          onChange={handleChange}
          required
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="email"
          type="email"
          placeholder="Email *"
          value={form.email}
          onChange={handleChange}
          required
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="phone"
          type="tel"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="address"
          placeholder="Home address"
          value={form.address}
          onChange={handleChange}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          name="notes"
          placeholder="Any notes for sitters (e.g. gate code, parking)"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
