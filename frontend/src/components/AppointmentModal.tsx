import { useState } from "react";
import { format } from "date-fns";
import api, { Appointment, Pet } from "../lib/api";

interface Props {
  sitterId: string;
  pets: Pet[];
  initial?: Partial<Appointment> & { start?: Date; end?: Date };
  onClose: () => void;
  onSaved: () => void;
}

export default function AppointmentModal({ sitterId, pets, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial?.id;
  const fmt = (d?: Date | string) =>
    d ? format(new Date(d), "yyyy-MM-dd'T'HH:mm") : "";

  const [startDate, setStartDate] = useState(
    fmt(initial?.start ?? initial?.start_date)
  );
  const [endDate, setEndDate] = useState(
    fmt(initial?.end ?? initial?.end_date)
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [status, setStatus] = useState(initial?.status ?? "confirmed");
  const [selectedPets, setSelectedPets] = useState<string[]>(
    initial?.pets?.map((p) => p.id) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function togglePet(id: string) {
    setSelectedPets((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        notes,
        status,
        pet_ids: selectedPets,
      };
      if (isEdit) {
        await api.put(`/appointments/${initial!.id}`, payload);
      } else {
        await api.post("/appointments/", payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id || !confirm("Delete this appointment?")) return;
    setSaving(true);
    try {
      await api.delete(`/appointments/${initial.id}`);
      onSaved();
      onClose();
    } catch {
      setError("Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">
          {isEdit ? "Edit Appointment" : "New Appointment"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Start</span>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">End</span>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-gray-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="confirmed">Confirmed</option>
              <option value="blocked">Blocked / Unavailable</option>
            </select>
          </label>

          {pets.length > 0 && (
            <div>
              <span className="text-sm text-gray-600">Pets</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {pets.map((pet) => (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => togglePet(pet.id)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      selectedPets.includes(pet.id)
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {pet.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="text-sm text-gray-600">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
