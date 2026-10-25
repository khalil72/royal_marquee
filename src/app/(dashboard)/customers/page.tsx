"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ellipsis, Eye, Pencil, Plus, Search, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate, formatMoney, initials } from "@/lib/format";
import { useBookingViews } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const currency = useStore((s) => s.settings.currency);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const views = useBookingViews();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; total: number; due: number; last?: string }>();
    for (const v of views) {
      const s = map.get(v.booking.customerId) ?? { count: 0, total: 0, due: 0 };
      s.count++;
      if (v.booking.status !== "Cancelled") {
        s.total += v.totals.grandTotal;
        s.due += Math.max(0, v.summary.remaining);
      }
      if (!s.last || v.booking.event.date > s.last) s.last = v.booking.event.date;
      map.set(v.booking.customerId, s);
    }
    return map;
  }, [views]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter(
      (c) => !q || [c.name, c.mobile, c.whatsapp, c.email, c.cnic, c.address].filter(Boolean).some((s) => s!.toLowerCase().includes(q)),
    );
  }, [customers, query]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${customers.length} customers on record`}
        actions={<Button size="lg" onClick={openNew}><UserPlus /> Add Customer</Button>}
      />
      <div className="rounded-xl border bg-card shadow-xs">
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, mobile, CNIC, address…" className="h-9 pl-9" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? "No customers match your search" : "No customers yet"}
            description="Customers are added automatically when you create a booking, or you can add them here."
            action={!query && <Button onClick={openNew}><Plus /> Add customer</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Total business</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Last event</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const s = stats.get(c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(c.name)}</span>
                          <span>
                            <span className="block font-medium hover:underline">{c.name}</span>
                            {c.cnic && <span className="block text-xs text-muted-foreground">CNIC {c.cnic}</span>}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p>{c.mobile}</p>
                        {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground">{c.address}</TableCell>
                      <TableCell className="text-right tabular-nums">{s?.count ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(s?.total ?? 0, currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={s?.due ? "font-medium text-destructive" : "text-muted-foreground"}>{formatMoney(s?.due ?? 0, currency)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{s?.last ? formatDate(s.last) : "—"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}><Ellipsis /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/customers/${c.id}`}><Eye /> View</Link></DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { setEditing(c); setDialogOpen(true); }}><Pencil /> Edit</DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/bookings/new?customer=${c.id}`}><Plus /> New booking</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}><Trash2 /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "customer"}?`}
        description="Customers with bookings cannot be deleted, to keep booking and payment history intact."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const r = await deleteCustomer(deleting.id);
          if (!r.ok) toast.error(r.error);
          else toast.success("Customer deleted");
          setDeleting(null);
        }}
      />
    </>
  );
}
