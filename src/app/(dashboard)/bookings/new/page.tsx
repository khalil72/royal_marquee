"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { BookingForm } from "@/components/bookings/booking-form";

export default function NewBookingPage() {
  const params = useSearchParams();
  return (
    <>
      <PageHeader
        title="Create New Event Booking"
        description="Register the customer, schedule the event, check hall availability and calculate charges."
        backHref="/bookings"
      />
      <BookingForm
        initialDate={params.get("date") ?? undefined}
        initialHallId={params.get("hall") ?? undefined}
        initialStart={params.get("start") ?? undefined}
        initialCustomerId={params.get("customer") ?? undefined}
      />
    </>
  );
}
