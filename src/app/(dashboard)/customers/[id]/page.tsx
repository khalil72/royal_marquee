"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClipboardList, Mail, MapPin, MessageCircle, Pencil, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/form-field";
import { NotFoundState } from "@/components/shared/not-found-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useBookingViews } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { Banknote, CircleDollarSign } from "lucide-react";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customer = useStore((s) => s.customers.find((c) => c.id === id));
  const currency = useStore((s) => s.settings.currency);
  const all = useBookingViews();
  const [editOpen, setEditOpen] = useState(false);
  const views = useMemo(
    () => all.filter((v) => v.booking.customerId === id).sort((a, b) => b.start.getTime() - a.start.getTime()),
    [all, id],
  );

  if (!customer) return <NotFoundState title="Customer not found" backHref="/customers" backLabel="Back to customers" />;
  const active = views.filter((v) => v.booking.status !== "Cancelled");
  const total = active.reduce((s, v) => s + v.totals.grandTotal, 0);
  const paid = views.reduce((s, v) => s + v.summary.totalPaid, 0);
  const due = active.reduce((s, v) => s + Math.max(0, v.summary.remaining), 0);

  return (
    <>
      <PageHeader
        backHref="/customers"
        title={customer.name}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>
            <Button asChild size="lg"><Link href={`/bookings/new?customer=${customer.id}`}><Plus /> New booking</Link></Button>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bookings" value={views.length} hint={`${active.length} active`} icon={ClipboardList} />
        <StatCard label="Total paid" value={formatMoney(paid, currency)} hint={`of ${formatMoney(total, currency)}`} icon={Banknote} tone="success" />
        <StatCard label="Outstanding" value={formatMoney(due, currency)} icon={CircleDollarSign} tone="danger" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionCard title="Contact">
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-3"><Phone className="size-4 text-muted-foreground" /><a href={`tel:${customer.mobile}`} className="hover:underline">{customer.mobile}</a></p>
            {customer.whatsapp && <p className="flex items-center gap-3"><MessageCircle className="size-4 text-muted-foreground" />{customer.whatsapp}</p>}
            {customer.email && <p className="flex items-center gap-3"><Mail className="size-4 text-muted-foreground" />{customer.email}</p>}
            <p className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 text-muted-foreground" />{customer.address}</p>
            {customer.cnic && <p className="text-muted-foreground">CNIC: <span className="text-foreground">{customer.cnic}</span></p>}
            {customer.notes && <p className="rounded-lg bg-muted/50 p-3">{customer.notes}</p>}
          </div>
        </SectionCard>
        <SectionCard title="Booking history" className="[&>div]:p-0">
          {views.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No bookings yet" />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Event date</TableHead>
                    <TableHead>Hall</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {views.map((v) => (
                    <TableRow key={v.booking.id}>
                      <TableCell>
                        <Link href={`/bookings/${v.booking.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">{v.booking.bookingNumber}</Link>
                        <p className="text-xs text-muted-foreground">{v.booking.event.title}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(v.booking.event.date)}
                        <p className="text-xs text-muted-foreground">{formatTime(v.booking.event.startTime)} – {formatTime(v.booking.event.endTime)}</p>
                      </TableCell>
                      <TableCell>{v.hall?.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(v.totals.grandTotal, currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(v.summary.remaining, currency)}</TableCell>
                      <TableCell><StatusBadge status={v.booking.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </div>
      <CustomerDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
    </>
  );
}
