import { useState } from "react";
import { format } from "date-fns";
import api, { Pet, Sitter } from "../lib/api";

interface Props {
  sitter: Sitter;
  pets: Pet[];
  initialStart?: Date;
  initialEnd?: Date;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function BookingRequestModal({
  sitter,
  pets,
  initialStart,
  initialEnd,
  onClose,
  onSubmitted,
}: Props) {
  const fmt = (d?: Date) => (d ? format(d, "yyyy-MM-dd'T'HH:mm") : "");

  const [startDate, setStartDate] = useState(fmt(initialStart));
  const [endDate, setEndDate] = useState(fmt(initialEnd));
  const [message, setMessage] = useState("");
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
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
      await api.post("/booking-requests/", {
        sitter_id: sitter.id,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        pet_ids: selectedPets,
        message,
      });
      onSubmitted();
      onClose();
    } catch {
      setError("Failed to submit request. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-1">Request Booking</h2>
        <p className="text-sm text-gray-500 mb-4">with {sitter.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Drop-off</span>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Pick-up</span>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {pets.length > 0 && (
            <div>
              <span className="text-sm text-gray-600">Which pets?</span>
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
            <span className="text-sm text-gray-600">Message (optional)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Any additional info for the sitter…"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
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
              {saving ? "Sending…" : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
