/**
 * One function per API endpoint. Mutations return the changed records in `diff`,
 * which the store merges into its state (see lib/store.ts).
 */
import type { BookingInput, CustomerInput, HallInput, PaymentInput } from "../domain";
import type { AppData, Booking, BookingStatus, Customer, Hall, Invoice, Payment, Settings } from "../types";
import type { LoginValues } from "../validation";
import { request } from "./client";

export interface SessionUser {
  username: string;
  role: "admin";
}

export type SettingsPatch = Partial<Omit<Settings, "logo">> & { logo?: string | null };

export const authApi = {
  login: (credentials: LoginValues) =>
    request<SessionUser>("POST", "/auth/login", { body: credentials, redirectOnUnauthorized: false }),
  logout: () => request<null>("POST", "/auth/logout", { redirectOnUnauthorized: false }),
  me: () => request<SessionUser>("GET", "/auth/me", { redirectOnUnauthorized: false }),
};

export const dataApi = {
  getAll: () => request<AppData>("GET", "/data"),
  import: (data: AppData) => request<null>("POST", "/data/import", { body: data }),
  reset: (demo: boolean) => request<null>("POST", "/data/reset", { body: { demo, confirm: "RESET" } }),
};

export const customersApi = {
  create: (input: CustomerInput) => request<Customer>("POST", "/customers", { body: input }),
  update: (id: string, input: CustomerInput) => request<Customer>("PUT", `/customers/${id}`, { body: input }),
  remove: (id: string) => request<null>("DELETE", `/customers/${id}`),
};

export const hallsApi = {
  create: (input: HallInput) => request<Hall>("POST", "/halls", { body: input }),
  update: (id: string, input: HallInput) => request<Hall>("PUT", `/halls/${id}`, { body: input }),
  remove: (id: string) => request<null>("DELETE", `/halls/${id}`),
};

export const bookingsApi = {
  create: (input: BookingInput) => request<Booking>("POST", "/bookings", { body: input }),
  update: (id: string, input: BookingInput) => request<Booking>("PUT", `/bookings/${id}`, { body: input }),
  setStatus: (id: string, status: BookingStatus, note?: string) =>
    request<Booking>("POST", `/bookings/${id}/status`, { body: { status, note } }),
  remove: (id: string) => request<null>("DELETE", `/bookings/${id}`),
  addPayment: (id: string, input: PaymentInput) => request<Payment>("POST", `/bookings/${id}/payments`, { body: input }),
  issueInvoice: (id: string, forceNew = false) =>
    request<Invoice>("POST", `/bookings/${id}/invoices`, { body: { forceNew } }),
};

export const paymentsApi = {
  void: (id: string, reason: string) => request<Payment>("POST", `/payments/${id}/void`, { body: { reason } }),
};

export const settingsApi = {
  update: (patch: SettingsPatch) => request<Settings>("PUT", "/settings", { body: patch }),
};
