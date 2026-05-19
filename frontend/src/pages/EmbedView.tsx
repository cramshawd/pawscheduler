import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, DateSelectArg } from "@fullcalendar/core";
import { useQuery } from "@tanstack/react-query";
import api, { Sitter, AppointmentPublic, AlternativeSitter } from "../lib/api";
import SitterCard from "../components/SitterCard";
import BookingRequestModal from "../components/BookingRequestModal";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type LoginMode = "signin" | "signup" | "reset";

function LoginModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<LoginMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setDone(true);
      } else if (mode === "signin") {
        await signIn(email, password);
        onClose();
      } else {
        await signUp(email, password);
        setDone(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">
            {mode === "reset" ? "Reset Password" : mode === "signin" ? "Sign In" : "Create Account"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">📬</div>
            <p className="text-sm text-gray-600">
              {mode === "reset"
                ? "Check your email for a reset link."
                : "Check your email to confirm your account, then sign in."}
            </p>
            <button onClick={() => { setMode("signin"); setDone(false); }} className="mt-3 text-sm text-brand-600 hover:underline">
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm mb-4">
              {(["signin", "signup"] as LoginMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(""); }}
                  className={`flex-1 py-2 font-medium transition-colors ${mode === m ? "bg-brand-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  {m === "signin" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {mode !== "reset" && (
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              )}
              {mode === "signin" && (
                <div className="text-right">
                  <button type="button" onClick={() => { setMode("reset"); setError(""); }} className="text-xs text-gray-400 hover:text-brand-600">
                    Forgot password?
                  </button>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {loading ? "…" : mode === "reset" ? "Send Reset Link" : mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function EmbedView() {
  const { client, signOut, user } = useAuth();
  const navigate = useNavigate();

  const [selectedSitter, setSelectedSitter] = useState<Sitter | null>(null);
  const [selection, setSelection] = useState<{ start: Date; end: Date } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [range, setRange] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      end: new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString(),
    };
  });

  const { data: sitters = [] } = useQuery<Sitter[]>({
    queryKey: ["public-sitters"],
    queryFn: () => api.get("/sitters/").then((r) => r.data),
  });

  const { data: appointments = [] } = useQuery<AppointmentPublic[]>({
    queryKey: ["public-calendar", selectedSitter?.id, range],
    queryFn: () =>
      selectedSitter
        ? api
            .get(`/appointments/public/${selectedSitter.id}`, {
              params: { start: range.start, end: range.end },
            })
            .then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!selectedSitter,
  });

  const { data: alternatives = [] } = useQuery<AlternativeSitter[]>({
    queryKey: ["alternatives", selectedSitter?.id, selection?.start, selection?.end],
    queryFn: () =>
      api
        .get("/appointments/alternatives", {
          params: {
            start: selection!.start.toISOString(),
            end: selection!.end.toISOString(),
            exclude_sitter_id: selectedSitter!.id,
          },
        })
        .then((r) => r.data),
    enabled: !!(selection && selectedSitter),
  });

  const events: EventInput[] = appointments.map((a) => ({
    id: a.id,
    title: "Booked",
    start: a.start_date,
    end: a.end_date,
    backgroundColor: "#ef4444",
    borderColor: "transparent",
    display: "background",
  }));

  if (selection) {
    events.push({
      id: "selection",
      title: "Your dates",
      start: selection.start,
      end: selection.end,
      backgroundColor: "#3b82f6",
      borderColor: "transparent",
    });
  }

  function handleSelect(arg: DateSelectArg) {
    setSelection({ start: arg.start, end: arg.end });
  }

  function handleBookClick() {
    if (!client) {
      setShowLoginModal(true);
      return;
    }
    setShowBookingModal(true);
  }

  const isSelectedSitterBooked =
    selection &&
    appointments.some((a) => {
      const apptStart = new Date(a.start_date);
      const apptEnd = new Date(a.end_date);
      return apptStart < selection.end && apptEnd > selection.start;
    });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center pt-4 relative">
          <h1 className="text-2xl font-bold text-gray-800">Find a Dog Sitter</h1>
          <p className="text-gray-500 text-sm mt-1">
            Select a sitter, then click and drag on the calendar to pick your dates.
          </p>
          <div className="absolute top-0 right-0 flex items-center gap-3">
            {user && !client && (
              <Link to="/" className="text-xs text-gray-400 hover:text-brand-600 transition-colors">
                Staff Dashboard →
              </Link>
            )}
            {user ? (
              <button
                onClick={signOut}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sitter list */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Sitters
            </p>
            {sitters.map((s) => (
              <SitterCard
                key={s.id}
                sitter={s}
                selected={selectedSitter?.id === s.id}
                onClick={() => {
                  setSelectedSitter(s);
                  setSelection(null);
                }}
              />
            ))}
          </div>

          {/* Calendar */}
          <div className="md:col-span-2 space-y-4">
            {!selectedSitter ? (
              <div className="bg-white rounded-xl border border-gray-200 h-64 flex items-center justify-center text-gray-400 text-sm">
                Select a sitter to view their calendar
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {selectedSitter.name}'s Calendar
                </p>
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{ left: "prev,next", center: "title", right: "" }}
                  events={events}
                  selectable
                  select={handleSelect}
                  datesSet={(info) =>
                    setRange({ start: info.startStr, end: info.endStr })
                  }
                  height="auto"
                />
              </div>
            )}

            {/* Booking action */}
            {selection && selectedSitter && (
              <div
                className={`rounded-xl border p-4 ${
                  isSelectedSitterBooked
                    ? "bg-red-50 border-red-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                {isSelectedSitterBooked ? (
                  <p className="text-sm text-red-700 font-medium">
                    {selectedSitter.name} is already booked for those dates.
                    See available sitters below.
                  </p>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-700 font-medium">
                      {selectedSitter.name} is available!
                    </p>
                    <button
                      onClick={handleBookClick}
                      className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
                    >
                      {client ? "Request Booking" : "Sign In to Book"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Alternatives */}
            {isSelectedSitterBooked && alternatives.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Other Sitters
                </p>
                <div className="space-y-2">
                  {alternatives.map(({ sitter, available }) => (
                    <div key={sitter.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <SitterCard
                          sitter={sitter}
                          available={available}
                          onClick={() => {
                            setSelectedSitter(sitter);
                            setSelection(null);
                          }}
                        />
                      </div>
                      {available && (
                        <button
                          onClick={() => {
                            setSelectedSitter(sitter);
                            if (client) setShowBookingModal(true);
                            else setShowLoginModal(true);
                          }}
                          className="shrink-0 px-3 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
                        >
                          Book
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {showBookingModal && selectedSitter && (
        <BookingRequestModal
          sitter={selectedSitter}
          pets={client?.pets ?? []}
          initialStart={selection?.start}
          initialEnd={selection?.end}
          onClose={() => setShowBookingModal(false)}
          onSubmitted={() => navigate("/client")}
        />
      )}
    </div>
  );
}
