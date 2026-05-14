import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import api, { BookingRequest, Pet } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
};

export default function ClientPortal() {
  const { client, refreshProfile } = useAuth();
  const qc = useQueryClient();

  // ── Booking requests ───────────────────────────────────────────────────────
  const { data: requests = [] } = useQuery<BookingRequest[]>({
    queryKey: ["my-requests"],
    queryFn: () => api.get("/booking-requests/mine").then((r) => r.data),
  });

  // ── Pets ───────────────────────────────────────────────────────────────────
  const [newPet, setNewPet] = useState({
    name: "", breed: "", diet_notes: "", medication_notes: "", behavioral_notes: "",
  });
  const [showPetForm, setShowPetForm] = useState(false);
  const [petError, setPetError] = useState("");

  const addPet = useMutation({
    mutationFn: (pet: typeof newPet) => api.post("/clients/me/pets", pet),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      refreshProfile();
      setShowPetForm(false);
      setNewPet({ name: "", breed: "", diet_notes: "", medication_notes: "", behavioral_notes: "" });
    },
    onError: () => setPetError("Failed to add pet"),
  });

  const deletePet = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/me/pets/${id}`),
    onSuccess: () => refreshProfile(),
  });

  if (!client) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-10">
      {/* Profile summary */}
      <section>
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{client.email} · {client.address}</p>
      </section>

      {/* Pets */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Pets</h2>
          <button
            onClick={() => setShowPetForm((v) => !v)}
            className="text-sm text-brand-600 font-medium hover:underline"
          >
            + Add pet
          </button>
        </div>

        {showPetForm && (
          <form
            onSubmit={(e) => { e.preventDefault(); addPet.mutate(newPet); }}
            className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3 mb-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Name *"
                value={newPet.name}
                onChange={(e) => setNewPet((p) => ({ ...p, name: e.target.value }))}
                required
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Breed"
                value={newPet.breed}
                onChange={(e) => setNewPet((p) => ({ ...p, breed: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <textarea
              placeholder="Diet notes"
              value={newPet.diet_notes}
              onChange={(e) => setNewPet((p) => ({ ...p, diet_notes: e.target.value }))}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Medication notes"
              value={newPet.medication_notes}
              onChange={(e) => setNewPet((p) => ({ ...p, medication_notes: e.target.value }))}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Behavioral notes"
              value={newPet.behavioral_notes}
              onChange={(e) => setNewPet((p) => ({ ...p, behavioral_notes: e.target.value }))}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {petError && <p className="text-sm text-red-600">{petError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowPetForm(false)} className="text-sm text-gray-500">
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
              >
                Save Pet
              </button>
            </div>
          </form>
        )}

        {client.pets.length === 0 ? (
          <p className="text-sm text-gray-400">No pets added yet.</p>
        ) : (
          <div className="space-y-2">
            {client.pets.map((pet: Pet) => (
              <div
                key={pet.id}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{pet.name}</p>
                  {pet.breed && <p className="text-xs text-gray-500">{pet.breed}</p>}
                </div>
                <button
                  onClick={() => deletePet.mutate(pet.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Booking requests */}
      <section>
        <h2 className="text-lg font-semibold mb-3">My Booking Requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-400">
            No requests yet.{" "}
            <a href="/embed" className="text-brand-600 hover:underline">
              Find a sitter →
            </a>
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(req.start_date), "MMM d")} –{" "}
                      {format(new Date(req.end_date), "MMM d, yyyy")}
                    </p>
                    {req.message && (
                      <p className="text-xs text-gray-500 mt-1">{req.message}</p>
                    )}
                    {req.pets.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {req.pets.map((p) => p.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
