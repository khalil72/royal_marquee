"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CalendarDays, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HallDialog } from "@/components/halls/hall-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useBookingViews } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Hall } from "@/lib/types";

export default function HallsPage() {
  const halls = useStore((s) => s.halls);
  const currency = useStore((s) => s.settings.currency);
  const deleteHall = useStore((s) => s.deleteHall);
  const views = useBookingViews();
  const [editing, setEditing] = useState<Hall | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Hall | null>(null);

  const info = useMemo(() => {
    const now = new Date();
    return new Map(
      halls.map((h) => {
        const list = views.filter((v) => v.booking.event.hallId === h.id && v.booking.status !== "Cancelled");
        const next = list.filter((v) => v.end >= now).sort((a, b) => a.start.getTime() - b.start.getTime())[0];
        const revenue = list.reduce((s, v) => s + v.totals.grandTotal, 0);
        return [h.id, { count: list.length, next, revenue }];
      }),
    );
  }, [halls, views]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Halls & Venues"
        description="Manage marquees, halls and their areas. Each hall has its own availability."
        actions={<Button size="lg" onClick={openNew}><Plus /> Add Hall</Button>}
      />
      {halls.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={Building2} title="No halls yet" description="Add your first marquee or hall to start taking bookings." action={<Button onClick={openNew}><Plus /> Add hall</Button>} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {halls.map((h) => {
            const i = info.get(h.id);
            return (
              <div key={h.id} className={cn("flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs", !h.active && "opacity-70")}>
                <div className="h-1.5" style={{ background: h.color }} />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{h.name}</h3>
                      {h.location && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{h.location}</p>}
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", h.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                      {h.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {h.description && <p className="mt-3 text-sm text-muted-foreground">{h.description}</p>}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><Users className="size-3" />Capacity</p>
                      <p className="text-sm font-semibold">{h.capacity}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-[11px] text-muted-foreground">{h.divided ? "Full hall rent" : "Base rent"}</p>
                      <p className="truncate text-sm font-semibold">{formatMoney(h.baseRent, currency)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-[11px] text-muted-foreground">Bookings</p>
                      <p className="text-sm font-semibold">{i?.count ?? 0}</p>
                    </div>
                  </div>
                  {h.divided && (h.portions?.length ?? 0) > 0 && (
                    <div className="mt-3 rounded-lg border p-2.5">
                      <p className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span>{h.portions!.length} portions</span>
                        <span>{h.allowFullBooking !== false ? "Full hall or by portion" : "By portion only"}</span>
                      </p>
                      <ul className="space-y-1">
                        {h.portions!.map((p) => (
                          <li key={p.id} className={cn("flex items-center justify-between gap-2 text-xs", !p.active && "text-muted-foreground line-through")}>
                            <span className="truncate font-medium">{p.name}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {p.capacity} guests · {formatMoney(p.rent, currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {h.areas.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {h.areas.map((a) => <span key={a} className="rounded-md border px-2 py-0.5 text-xs">{a}</span>)}
                    </div>
                  )}
                  <div className="mt-4 rounded-lg border border-dashed p-3 text-xs">
                    <p className="flex items-center gap-1.5 font-medium text-muted-foreground"><CalendarDays className="size-3.5" /> Next event</p>
                    {i?.next ? (
                      <Link href={`/bookings/${i.next.booking.id}`} className="mt-1 block hover:underline">
                        <span className="font-medium">{i.next.booking.event.title}</span> · {formatDate(i.next.booking.event.date)} {formatTime(i.next.booking.event.startTime)}
                      </Link>
                    ) : (
                      <p className="mt-1 text-muted-foreground">No upcoming events</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 border-t p-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(h); setOpen(true); }}><Pencil /> Edit</Button>
                  <Button asChild variant="outline" size="sm" className="flex-1"><Link href={`/bookings/new?hall=${h.id}`}><Plus /> Book</Link></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${h.name}`} onClick={() => setDeleting(h)}><Trash2 /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <HallDialog open={open} onOpenChange={setOpen} hall={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "hall"}?`}
        description="Halls that have bookings cannot be deleted — mark them inactive instead."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const r = await deleteHall(deleting.id);
          if (!r.ok) toast.error(r.error);
          else toast.success("Hall deleted");
          setDeleting(null);
        }}
      />
    </>
  );
}
