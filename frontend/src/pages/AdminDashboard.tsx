import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { EventInput } from "@fullcalendar/core";
import { format } from "date-fns";
import api, { Sitter, Appointment, Invite, Client } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Tab = "calendar" | "sitters" | "clients" | "invites";

export default function AdminDashboard() {
  const { sitter: owner } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("calendar");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
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
      api
        .get("/appointments/admin/all", { params: { start: range.start, end: range.end } })
        .then((r) => r.data),
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

  const SITTER_COLORS = [
    "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4",
  ];

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
  }));

  const TABS: { key: Tab; label: string }[] = [
    { key: "calendar", label: "All Calendars" },
    { key: "sitters", label: "Sitters" },
    { key: "clients", label: "Clients" },
    { key: "invites", label: "Invites" },
  ];

  if (!owner?.is_owner) return null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* All Calendars */}
      {tab === "calendar" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {allSitters.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-sm">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: sitterColorMap[s.id] }}
                />
                {s.name}
              </div>
            ))}
          </div>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            events={events}
            datesSet={(info) => setRange({ start: info.startStr, end: info.endStr })}
            height="auto"
          />
        </div>
      )}

      {/* Sitters */}
      {tab === "sitters" && (
        <div className="space-y-3">
          {allSitters.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-gray-500">{s.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {s.is_owner && (
                  <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                    Owner
                  </span>
                )}
                {!s.is_owner && s.is_active && (
                  <button
                    onClick={() => {
                      if (confirm(`Deactivate ${s.name}?`)) deactivateSitter.mutate(s.id);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Deactivate
                  </button>
                )}
                {!s.is_active && (
                  <span className="text-xs text-gray-400">Inactive</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clients */}
      {tab === "clients" && (
        <div className="space-y-3">
          {allClients.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.email}</p>
                  {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                </div>
                {c.pets.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {c.pets.map((p) => p.name).join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}
          {allClients.length === 0 && (
            <p className="text-sm text-gray-400">No clients yet.</p>
          )}
        </div>
      )}

      {/* Invites */}
      {tab === "invites" && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendInvite.mutate(inviteEmail);
            }}
            className="flex gap-3"
          >
            <input
              type="email"
              placeholder="Sitter's email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{inv.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Expires {format(new Date(inv.expires_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    {inv.used_at ? (
                      <span className="text-xs text-green-600 font-medium">Accepted</span>
                    ) : (
                      <span className="text-xs text-yellow-600 font-medium">Pending</span>
                    )}
                    {!inv.used_at && (
                      <button
                        onClick={() => navigator.clipboard.writeText(inv.invite_url)}
                        className="block text-xs text-gray-400 hover:text-brand-600 mt-0.5"
                      >
                        Copy link
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {invites.length === 0 && (
              <p className="text-sm text-gray-400">No invites sent yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
