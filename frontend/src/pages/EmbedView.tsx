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

export default function EmbedView() {
  const { client, sitter } = useAuth();
  const navigate = useNavigate();

  const [selectedSitter, setSelectedSitter] = useState<Sitter | null>(null);
  const [selection, setSelection] = useState<{ start: Date; end: Date } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

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
      navigate("/login");
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
          {sitter?.is_owner && (
            <Link
              to="/admin"
              className="absolute top-0 right-0 text-xs text-gray-400 hover:text-brand-600 transition-colors"
            >
              Admin Dashboard →
            </Link>
          )}
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
                      {client ? "Request Booking" : "Sign in to Book"}
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
                            else navigate("/login");
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
