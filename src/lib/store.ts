"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  authApi,
  bookingsApi,
  COLLECTIONS,
  customersApi,
  dataApi,
  hallsApi,
  paymentsApi,
  settingsApi,
  type ApiResult,
  type DataDiff,
  type SettingsPatch,
} from "./api";
import type { BookingInput, CustomerInput, HallInput, PaymentInput, Result } from "./domain";
import { emptyData } from "./seed";
import type { AppData, Booking, BookingStatus, Customer, Hall, Invoice, Payment, Settings } from "./types";

export type { BookingInput, CustomerInput, HallInput, PaymentInput, Result } from "./domain";

interface StoreState extends AppData {
  hydrated: boolean;
  loadError: string | null;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  load: () => Promise<void>;
  logout: () => Promise<void>;

  addCustomer: (input: CustomerInput) => Promise<Result<Customer>>;
  updateCustomer: (id: string, input: CustomerInput) => Promise<Result<Customer>>;
  deleteCustomer: (id: string) => Promise<Result<null>>;

  addHall: (input: HallInput) => Promise<Result<Hall>>;
  updateHall: (id: string, input: HallInput) => Promise<Result<Hall>>;
  deleteHall: (id: string) => Promise<Result<null>>;

  createBooking: (input: BookingInput) => Promise<Result<Booking>>;
  updateBooking: (id: string, input: BookingInput) => Promise<Result<Booking>>;
  setBookingStatus: (id: string, status: BookingStatus, note?: string) => Promise<Result<Booking>>;
  deleteBooking: (id: string) => Promise<Result<null>>;

  addPayment: (bookingId: string, input: PaymentInput) => Promise<Result<Payment>>;
  voidPayment: (paymentId: string, reason: string) => Promise<Result<Payment>>;

  issueInvoice: (bookingId: string, forceNew?: boolean) => Promise<Result<Invoice>>;

  updateSettings: (patch: SettingsPatch) => Promise<Result<Settings>>;
  importData: (data: AppData) => Promise<Result<null>>;
  resetData: (withDemo: boolean) => Promise<Result<null>>;
}

function applyDiff(state: AppData, diff: DataDiff): Partial<AppData> {
  const patch: Partial<AppData> = {};
  if (diff.settings) patch.settings = diff.settings;
  for (const name of COLLECTIONS) {
    const upserts = (diff.upsert[name] ?? []) as { id: string }[];
    const removed = new Set(diff.remove[name] ?? []);
    if (!upserts.length && !removed.size) continue;
    const byId = new Map(upserts.map((r) => [r.id, r]));
    const current = state[name] as { id: string }[];
    const kept = current.filter((r) => !removed.has(r.id)).map((r) => byId.get(r.id) ?? r);
    const existing = new Set(current.map((r) => r.id));
    const added = upserts.filter((r) => !existing.has(r.id));
    // Newest first for customers/bookings, chronological for the rest
    const merged = name === "customers" || name === "bookings" ? [...added, ...kept] : [...kept, ...added];
    (patch as Record<string, unknown>)[name] = merged;
  }
  return patch;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** Merge the records a mutation changed into local state. */
      const apply = async <T,>(call: Promise<ApiResult<T>>): Promise<Result<T>> => {
        const result = await call;
        if (!result.ok) return result;
        if (result.diff) set(applyDiff(get(), result.diff));
        return { ok: true, data: result.data };
      };

      return {
        ...emptyData(),
        hydrated: false,
        loadError: null,
        sidebarCollapsed: false,
        toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

        load: async () => {
          set({ loadError: null });
          const result = await dataApi.getAll();
          if (result.ok) set({ ...result.data, hydrated: true });
          else set({ loadError: result.error });
        },
        logout: async () => {
          await authApi.logout();
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/login?signedOut=1");
        },

        addCustomer: (input) => apply(customersApi.create(input)),
        updateCustomer: (id, input) => apply(customersApi.update(id, input)),
        deleteCustomer: (id) => apply(customersApi.remove(id)),

        addHall: (input) => apply(hallsApi.create(input)),
        updateHall: (id, input) => apply(hallsApi.update(id, input)),
        deleteHall: (id) => apply(hallsApi.remove(id)),

        createBooking: (input) => apply(bookingsApi.create(input)),
        updateBooking: (id, input) => apply(bookingsApi.update(id, input)),
        setBookingStatus: (id, status, note) => apply(bookingsApi.setStatus(id, status, note)),
        deleteBooking: (id) => apply(bookingsApi.remove(id)),

        addPayment: (bookingId, input) => apply(bookingsApi.addPayment(bookingId, input)),
        voidPayment: (paymentId, reason) => apply(paymentsApi.void(paymentId, reason)),

        issueInvoice: (bookingId, forceNew = false) => apply(bookingsApi.issueInvoice(bookingId, forceNew)),

        updateSettings: (patch) => apply(settingsApi.update(patch)),
        importData: (data) => apply(dataApi.import(data)),
        resetData: (withDemo) => apply(dataApi.reset(withDemo)),
      };
    },
    {
      // Only the sidebar preference lives in the browser; all records come from the server
      name: "marquee-ui",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);

export function exportData(): AppData {
  const { settings, halls, customers, bookings, payments, invoices } = useStore.getState();
  return { settings, halls, customers, bookings, payments, invoices };
}
