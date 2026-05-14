import axios from "axios";
import { supabase } from "./supabase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Sitter {
  id: string;
  name: string;
  bio?: string;
}

export interface Pet {
  id: string;
  client_id: string;
  name: string;
  breed?: string;
  diet_notes?: string;
  medication_notes?: string;
  behavioral_notes?: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  pets: Pet[];
}

export interface AppointmentPublic {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface Appointment extends AppointmentPublic {
  sitter_id: string;
  client_id?: string;
  notes?: string;
  pets: Pet[];
}

export interface BookingRequest {
  id: string;
  sitter_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  status: "pending" | "confirmed" | "declined";
  message?: string;
  pets: Pet[];
  client?: { id: string; name: string };
  created_at: string;
}

export interface Invite {
  id: string;
  email: string;
  expires_at: string;
  used_at?: string;
  invite_url: string;
}

export interface AlternativeSitter {
  sitter: Sitter;
  available: boolean;
}
