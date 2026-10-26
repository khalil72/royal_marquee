"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { PrintToolbar } from "@/components/invoice/print-toolbar";
import { NotFoundState } from "@/components/shared/not-found-state";
import { PageHeader } from "@/components/shared/page-header";
import { useBookingView } from "@/lib/hooks";
import { useStore } from "@/lib/store";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const invoice = useStore((s) => s.invoices.find((i) => i.id === id));
  const settings = useStore((s) => s.settings);
  const view = useBookingView(invoice?.bookingId);
  const ref = useRef<HTMLDivElement>(null);
  const autoPrint = search.get("print") === "1";

  useEffect(() => {
    if (!autoPrint || !view) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [autoPrint, view]);

  if (!invoice || !view) return <NotFoundState title="Invoice not found" backHref="/invoices" backLabel="Back to invoices" />;

  return (
    <>
      <PageHeader
        backHref={`/bookings/${view.booking.id}`}
        title={`Invoice ${invoice.invoiceNumber}`}
        description={`${view.booking.bookingNumber} · ${view.customer?.name ?? ""} · Preview is A4; amounts reflect the latest payments.`}
        actions={
          <PrintToolbar targetRef={ref} filename={`${invoice.invoiceNumber}.pdf`}>
            <Button asChild variant="outline" size="lg">
              <Link href={`/bookings/${view.booking.id}`}><ArrowLeft /> Back to booking</Link>
            </Button>
          </PrintToolbar>
        }
      />
      <div className="overflow-x-auto rounded-xl bg-muted/40 p-2 sm:p-6 print:overflow-visible print:bg-transparent print:p-0">
        <InvoiceDocument ref={ref} view={view} invoice={invoice} settings={settings} />
      </div>
    </>
  );
}
