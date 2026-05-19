import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventInput, EventClickArg } from "@fullcalendar/core";
import { format, isThisMonth } from "date-fns";
import api, { Sitter, Appointment, Invite, Client, BookingRequest } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Tab = "calendar" | "requests" | "sitters" | "clients" | "invites";

const SITTER_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4",
];

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  declined:  "bg-red-100 text-red-600",
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Event detail popover ──────────────────────────────────────────────────────
function EventPopover({
  event,
  sitters,
  onClose,
}: {
  event: EventClickArg;
  sitters: Sitter[];
  onClose: () => void;
}) {
  const appt = event.event.extendedProps as Appointment;
  const sitter = sitters.find((s) => s.id === appt.sitter_id);
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-5 max-w-xs w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{sitter?.name ?? "Unknown sitter"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="space-y-1.5 text-sm text-gray-600">
          <p>
            <span className="font-medium">From:</span>{" "}
            {format(new Date(appt.start_date), "MMM d, yyyy h:mm a")}
          </p>
          <p>
            <span className="font-medium">To:</span>{" "}
            {format(new Date(appt.end_date), "MMM d, yyyy h:mm a")}
          </p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[appt.status] ?? "bg-gray-100 text-gray-600"}`}>
              {appt.status}
            </span>
          </p>
          {appt.notes && (
            <p className="mt-2 text-gray-500 text-xs italic">"{appt.notes}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { sitter: owner } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("calendar");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clickedEvent, setClickedEvent] = useState<EventClickArg | null>(null);
  const [range, setRange] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      end: new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString(),
    };
  });

  const { data: allSitters = [] } = useQuery<Sitter[]>({
    queryKey: ["admin-sitters"],
    queryFn: () => api.get("/sitters/admin/all").then((r) => r.data),
  });

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/clients/admin/all").then((r) => r.data),
  });

  const { data: allAppointments = [] } = useQuery<Appointment[]>({
    queryKey: ["admin-appointments", range],
    queryFn: () =>
      api.get("/appointments/admin/all", { params: { start: range.start, end: range.end } })
        .then((r) => r.data),
  });

  const { data: allRequests = [] } = useQuery<BookingRequest[]>({
    queryKey: ["admin-requests"],
    queryFn: () => api.get("/booking-requests/admin/all").then((r) => r.data),
  });

  const { data: invites = [] } = useQuery<Invite[]>({
    queryKey: ["admin-invites"],
    queryFn: () => api.get("/invites/").then((r) => r.data),
  });

  const sendInvite = useMutation({
    mutationFn: (email: string) => api.post("/invites/", { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
      setInviteEmail("");
      setInviteError("");
    },
    onError: () => setInviteError("Failed to send invite"),
  });

  const deactivateSitter = useMutation({
    mutationFn: (id: string) => api.patch(`/sitters/admin/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-sitters"] }),
  });

  const respondToRequest = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/booking-requests/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-appointments"] });
    },
  });

  // ── Derived data ────────────────────────────────────────────────────────────
  const sitterColorMap = Object.fromEntries(
    allSitters.map((s, i) => [s.id, SITTER_COLORS[i % SITTER_COLORS.length]])
  );

  const events: EventInput[] = allAppointments.map((a) => ({
    id: a.id,
    title: allSitters.find((s) => s.id === a.sitter_id)?.name ?? "Unknown",
    start: a.start_date,
    end: a.end_date,
    backgroundColor: sitterColorMap[a.sitter_id] ?? "#ccc",
    borderColor: "transparent",
    extendedProps: a,
  }));

  const pendingRequests = allRequests.filter((r) => r.status === "pending");
  const apptThisMonth = allAppointments.filter((a) => isThisMonth(new Date(a.start_date)));
  const activeSitters = allSitters.filter((s) => s.is_active);

  // ── Request counts per sitter ───────────────────────────────────────────────
  const pendingBySitter = pendingRequests.reduce<Record<string, number>>((acc, r) => {
    acc[r.sitter_id] = (acc[r.sitter_id] ?? 0) + 1;
    return acc;
  }, {});

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "calendar",  label: "Calendars" },
    { key: "requests",  label: "Requests", badge: pendingRequests.length },
    { key: "sitters",   label: "Sitters" },
    { key: "clients",   label: "Clients" },
    { key: "invites",   label: "Invites" },
  ];

  async function copyInviteLink(inv: Invite) {
    await navigator.clipboard.writeText(inv.invite_url);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!owner?.is_owner) return null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Owner Dashboard</h1>
        <button
          onClick={() => setTab("invites")}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
        >
          + Invite Sitter
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Sitters"    value={activeSitters.length} />
        <StatCard label="Clients"           value={allClients.length} />
        <StatCard label="Pending Requests"  value={pendingRequests.length} />
        <StatCard label="Bookings This Month" value={apptThisMonth.length} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {!!t.badge && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── All Calendars ── */}
      {tab === "calendar" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 mb-4">
            {activeSitters.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sitterColorMap[s.id] }} />
                {s.name}
              </div>
            ))}
          </div>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }}
            events={events}
            eventClick={(arg) => setClickedEvent(arg)}
            datesSet={(info) => setRange({ start: info.startStr, end: info.endStr })}
            height="auto"
          />
        </div>
      )}

      {/* ── Requests ── */}
      {tab === "requests" && (
        <div className="space-y-3">
          {allRequests.length === 0 && (
            <p className="text-sm text-gray-400">No booking requests yet.</p>
          )}
          {allRequests.map((req) => {
            const sitter = allSitters.find((s) => s.id === req.sitter_id);
            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{req.client?.name ?? "Client"}</p>
                      <span className="text-gray-400 text-xs">→</span>
                      <p className="text-sm text-gray-600">{sitter?.name ?? "Sitter"}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[req.status]}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(req.start_date), "MMM d")} – {format(new Date(req.end_date), "MMM d, yyyy")}
                    </p>
                    {req.pets.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {req.pets.map((p) => p.name).join(", ")}
                      </p>
                    )}
                    {req.message && (
                      <p className="text-xs text-gray-400 italic mt-1">"{req.message}"</p>
                    )}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => respondToRequest.mutate({ id: req.id, status: "confirmed" })}
                        className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => respondToRequest.mutate({ id: req.id, status: "declined" })}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sitters ── */}
      {tab === "sitters" && (
        <div className="space-y-3">
          {allSitters.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: sitterColorMap[s.id] ?? "#ccc" }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{s.name}</p>
                    {s.is_owner && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        Owner
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                    {pendingBySitter[s.id] > 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        {pendingBySitter[s.id]} pending
                      </span>
                    )}
                  </div>
                  {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                </div>
              </div>
              {!s.is_owner && s.is_active && (
                <button
                  onClick={() => { if (confirm(`Deactivate ${s.name}?`)) deactivateSitter.mutate(s.id); }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Clients ── */}
      {tab === "clients" && (
        <div className="space-y-2">
          {allClients.length === 0 && (
            <p className="text-sm text-gray-400">No clients yet.</p>
          )}
          {allClients.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200">
              <button
                onClick={() => setExpandedClient(expandedClient === c.id ? null : c.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                  {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {c.pets.length > 0 && (
                    <span className="text-xs text-gray-400">{c.pets.length} pet{c.pets.length !== 1 ? "s" : ""}</span>
                  )}
                  <span className="text-gray-400 text-sm">{expandedClient === c.id ? "▲" : "▼"}</span>
                </div>
              </button>

              {expandedClient === c.id && c.pets.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  {c.pets.map((pet) => (
                    <div key={pet.id} className="text-sm">
                      <p className="font-medium text-gray-700">
                        {pet.name}{pet.breed ? <span className="font-normal text-gray-400"> · {pet.breed}</span> : ""}
                      </p>
                      {pet.diet_notes && (
                        <p className="text-xs text-gray-500 mt-0.5">🥩 {pet.diet_notes}</p>
                      )}
                      {pet.medication_notes && (
                        <p className="text-xs text-gray-500 mt-0.5">💊 {pet.medication_notes}</p>
                      )}
                      {pet.behavioral_notes && (
                        <p className="text-xs text-gray-500 mt-0.5">🐾 {pet.behavioral_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {expandedClient === c.id && c.pets.length === 0 && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <p className="text-xs text-gray-400">No pets added yet.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Invites ── */}
      {tab === "invites" && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => { e.preventDefault(); sendInvite.mutate(inviteEmail); }}
            className="flex gap-3"
          >
            <input
              type="email"
              placeholder="Sitter's email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              type="submit"
              disabled={sendInvite.isPending}
              className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {sendInvite.isPending ? "Sending…" : "Send Invite"}
            </button>
          </form>
          {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}

          <div className="space-y-3">
            {invites.length === 0 && (
              <p className="text-sm text-gray-400">No invites sent yet.</p>
            )}
            {invites.map((inv) => (
              <div key={inv.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{inv.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Expires {format(new Date(inv.expires_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.used_at ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {inv.used_at ? "Accepted" : "Pending"}
                  </span>
                  {!inv.used_at && (
                    <button
                      onClick={() => copyInviteLink(inv)}
                      className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
                    >
                      {copiedId === inv.id ? "Copied!" : "Copy link"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Event popover ── */}
      {clickedEvent && (
        <EventPopover
          event={clickedEvent}
          sitters={allSitters}
          onClose={() => setClickedEvent(null)}
        />
      )}
    </div>
  );
}
