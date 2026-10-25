"use client";

import { useParams } from "next/navigation";
import { NotFoundState } from "@/components/shared/not-found-state";
import { PageHeader } from "@/components/shared/page-header";
import { BookingForm } from "@/components/bookings/booking-form";
import { useStore } from "@/lib/store";

export default function EditBookingPage() {
  const { id } = useParams<{ id: string }>();
  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  if (!booking) return <NotFoundState />;
  return (
    <>
      <PageHeader
        title={`Edit ${booking.bookingNumber}`}
        description={booking.event.title}
        backHref={`/bookings/${booking.id}`}
      />
      <BookingForm key={booking.id} booking={booking} />
    </>
  );
}
