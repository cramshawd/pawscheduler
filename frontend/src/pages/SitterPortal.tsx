import { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg, EventInput } from "@fullcalendar/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import api, { Appointment, BookingRequest } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import AppointmentModal from "../components/AppointmentModal";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
};

export default function SitterPortal() {
  const { sitter } = useAuth();
  const qc = useQueryClient();
  const calRef = useRef<FullCalendar>(null);

  const [modalState, setModalState] = useState<{
    open: boolean;
    initial?: Partial<Appointment> & { start?: Date; end?: Date };
  }>({ open: false });

  const [range, setRange] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      end: new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString(),
    };
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["my-appointments", range],
    queryFn: () =>
      api
        .get("/appointments/mine", { params: { start: range.start, end: range.end } })
        .then((r) => r.data),
  });

  const { data: requests = [] } = useQuery<BookingRequest[]>({
    queryKey: ["incoming-requests"],
    queryFn: () => api.get("/booking-requests/incoming").then((r) => r.data),
  });

  const respondToRequest = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/booking-requests/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incoming-requests"] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
  });

  const events: EventInput[] = appointments.map((a) => ({
    id: a.id,
    title: a.status === "blocked" ? "Unavailable" : `Booked`,
    start: a.start_date,
    end: a.end_date,
    backgroundColor: a.status === "blocked" ? "#6b7280" : "#f59e0b",
    borderColor: "transparent",
    extendedProps: a,
  }));

  function handleDateClick(arg: DateClickArg) {
    setModalState({ open: true, initial: { start: arg.date } });
  }

  function handleEventClick(arg: EventClickArg) {
    setModalState({ open: true, initial: arg.event.extendedProps as Appointment });
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");

  if (!sitter) return null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Calendar</h1>
        <button
          onClick={() => setModalState({ open: true })}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
        >
          + Add appointment
        </button>
      </div>

      {/* Pending booking requests */}
      {pendingRequests.length > 0 && (
        <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="font-semibold text-yellow-800 mb-3">
            Pending Requests ({pendingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-lg border border-yellow-200 p-3 flex items-start justify-between"
              >
                <div>
                  <p className="font-medium text-sm">
                    {req.client?.name ?? "Client"} —{" "}
                    {format(new Date(req.start_date), "MMM d")} to{" "}
                    {format(new Date(req.end_date), "MMM d, yyyy")}
                  </p>
                  {req.pets.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {req.pets.map((p) => p.name).join(", ")}
                    </p>
                  )}
                  {req.message && (
                    <p className="text-xs text-gray-400 mt-1 italic">"{req.message}"</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
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
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          datesSet={(info) =>
            setRange({ start: info.startStr, end: info.endStr })
          }
          height="auto"
        />
      </div>

      {modalState.open && sitter && (
        <AppointmentModal
          sitterId={sitter.id}
          pets={[]}
          initial={modalState.initial}
          onClose={() => setModalState({ open: false })}
          onSaved={() => qc.invalidateQueries({ queryKey: ["my-appointments"] })}
        />
      )}
    </div>
  );
}
