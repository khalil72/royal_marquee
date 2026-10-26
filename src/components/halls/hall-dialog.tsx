"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LayoutGrid, Plus, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField, MoneyInput, numberValue } from "@/components/shared/form-field";
import { useStore } from "@/lib/store";
import type { Hall } from "@/lib/types";
import { HALL_COLORS } from "@/lib/ui";

const portionSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Name is required").max(80),
  capacity: z.number({ error: "Enter capacity" }).int("Whole number only").min(1, "At least 1"),
  rent: z.number({ error: "Enter rent" }).min(0, "Cannot be negative"),
  active: z.boolean(),
});

const hallSchema = z
  .object({
    name: z.string().trim().min(2, "Hall name is required"),
    areas: z.string(),
    capacity: z.number({ error: "Enter capacity" }).int().min(1, "Capacity must be at least 1"),
    baseRent: z.number({ error: "Enter rent" }).min(0, "Cannot be negative"),
    location: z.string(),
    description: z.string(),
    color: z.string(),
    active: z.boolean(),
    divided: z.boolean(),
    allowFullBooking: z.boolean(),
    portions: z.array(portionSchema),
  })
  .superRefine((v, ctx) => {
    if (!v.divided) return;
    if (v.portions.length < 2) {
      ctx.addIssue({ code: "custom", path: ["portions"], message: "Add at least two portions, or turn off division." });
    }
    const seen = new Set<string>();
    v.portions.forEach((p, i) => {
      const key = p.name.trim().toLowerCase();
      if (key && seen.has(key)) ctx.addIssue({ code: "custom", path: ["portions", i, "name"], message: "Name already used" });
      seen.add(key);
      if (p.capacity > v.capacity) {
        ctx.addIssue({ code: "custom", path: ["portions", i, "capacity"], message: "More than hall total" });
      }
    });
  });
type HallValues = z.infer<typeof hallSchema>;

const portionLetter = (i: number) => String.fromCharCode(65 + (i % 26));

export function HallDialog({ open, onOpenChange, hall }: { open: boolean; onOpenChange: (o: boolean) => void; hall?: Hall | null }) {
  const addHall = useStore((s) => s.addHall);
  const updateHall = useStore((s) => s.updateHall);
  const hallCount = useStore((s) => s.halls.length);
  const currency = useStore((s) => s.settings.currency);
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<HallValues>({ resolver: zodResolver(hallSchema) });
  const { fields, append, remove } = useFieldArray({ control, name: "portions" });
  const [divided, capacity, portions] = useWatch({ control, name: ["divided", "capacity", "portions"] });

  useEffect(() => {
    if (!open) return;
    reset(
      hall
        ? {
            ...hall,
            areas: hall.areas.join(", "),
            location: hall.location ?? "",
            description: hall.description ?? "",
            divided: !!hall.divided,
            allowFullBooking: hall.allowFullBooking !== false,
            portions: hall.portions ?? [],
          }
        : {
            name: "",
            areas: "",
            capacity: 300,
            baseRent: 0,
            location: "",
            description: "",
            color: HALL_COLORS[hallCount % HALL_COLORS.length],
            active: true,
            divided: false,
            allowFullBooking: true,
            portions: [],
          },
    );
  }, [open, hall, hallCount, reset]);

  const addPortion = () => {
    const { capacity: total, baseRent, portions: current } = getValues();
    const count = current.length + 1;
    append({
      id: "",
      name: `Portion ${portionLetter(current.length)}`,
      capacity: Math.max(1, Math.floor((total || 0) / Math.max(2, count))),
      rent: Math.round((baseRent || 0) / Math.max(2, count)),
      active: true,
    });
  };

  // Turning division on starts with two equal halves, which is the common setup
  const onDividedChange = (on: boolean, set: (v: boolean) => void) => {
    set(on);
    if (on && getValues("portions").length === 0) {
      const { capacity: total, baseRent } = getValues();
      for (let i = 0; i < 2; i++) {
        append({
          id: "",
          name: `Portion ${portionLetter(i)}`,
          capacity: Math.max(1, Math.floor((total || 0) / 2)),
          rent: Math.round((baseRent || 0) / 2),
          active: true,
        });
      }
    }
  };

  const onSubmit = async (v: HallValues) => {
    const input = {
      ...v,
      areas: v.areas.split(",").map((a) => a.trim()).filter(Boolean),
      portions: v.portions.map((p) => ({ ...p, name: p.name.trim() })),
    };
    const result = await (hall ? updateHall(hall.id, input) : addHall(input));
    if (!result.ok) return toast.error(result.error);
    toast.success(hall ? "Hall updated" : "Hall added");
    onOpenChange(false);
  };

  const portionTotal = (portions ?? []).reduce((s, p) => s + (Number(p?.capacity) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{hall ? "Edit hall / venue" : "Add hall / venue"}</DialogTitle>
          <DialogDescription>
            Halls are booked independently. Divide a hall into portions to host separate events in it at the same time.
          </DialogDescription>
        </DialogHeader>
        <form id="hall-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Hall / marquee name" htmlFor="h-name" required error={errors.name?.message} className="sm:col-span-2">
            <Input id="h-name" className="h-9" aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="Total capacity (guests)" htmlFor="h-cap" required error={errors.capacity?.message} hint="Whole hall">
            <Input id="h-cap" type="number" min={1} className="h-9" aria-invalid={!!errors.capacity} {...register("capacity", { setValueAs: numberValue })} />
          </FormField>
          <FormField label="Full hall rent" htmlFor="h-rent" error={errors.baseRent?.message} hint="Pre-filled on full-hall bookings">
            <MoneyInput id="h-rent" prefix={currency} {...register("baseRent", { setValueAs: numberValue })} />
          </FormField>

          {/* Booking configuration */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-4 sm:col-span-2">
            <div className="flex items-start gap-3">
              <LayoutGrid className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">Booking configuration</p>
                <p className="text-xs text-muted-foreground">
                  Booking the full hall reserves every portion. Booking a portion leaves the other portions free.
                </p>
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Divide into portions</span>
                <span className="block text-xs text-muted-foreground">Allow separate events in different portions at the same time</span>
              </span>
              <Controller
                control={control}
                name="divided"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={(on) => onDividedChange(on, field.onChange)} />}
              />
            </label>

            {divided && (
              <>
                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">Allow full hall booking</span>
                    <span className="block text-xs text-muted-foreground">Off: this hall can only be booked portion by portion</span>
                  </span>
                  <Controller control={control} name="allowFullBooking" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                </label>

                <div className="space-y-2">
                  <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto_auto] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
                    <span>Portion name</span>
                    <span>Capacity</span>
                    <span>Rent</span>
                    <span className="w-[76px]">Available</span>
                    <span className="w-8" />
                  </div>
                  {fields.map((f, i) => {
                    const e = errors.portions?.[i];
                    return (
                      <div
                        key={f.id}
                        className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto_auto] sm:items-start sm:border-0 sm:bg-transparent sm:p-0"
                      >
                        <div className="col-span-2 sm:col-span-1">
                          <Input aria-label={`Portion ${i + 1} name`} placeholder="e.g. Portion A" className="h-9" aria-invalid={!!e?.name} {...register(`portions.${i}.name`)} />
                          {e?.name && <p className="mt-1 text-xs text-destructive">{e.name.message}</p>}
                        </div>
                        <div>
                          <Input
                            aria-label={`Portion ${i + 1} capacity`}
                            type="number"
                            min={1}
                            placeholder="Guests"
                            className="h-9"
                            aria-invalid={!!e?.capacity}
                            {...register(`portions.${i}.capacity`, { setValueAs: numberValue })}
                          />
                          {e?.capacity && <p className="mt-1 text-xs text-destructive">{e.capacity.message}</p>}
                        </div>
                        <div>
                          <MoneyInput aria-label={`Portion ${i + 1} rent`} prefix={currency} invalid={!!e?.rent} {...register(`portions.${i}.rent`, { setValueAs: numberValue })} />
                          {e?.rent && <p className="mt-1 text-xs text-destructive">{e.rent.message}</p>}
                        </div>
                        <label className="flex h-9 w-[76px] cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                          <Controller
                            control={control}
                            name={`portions.${i}.active`}
                            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={`Portion ${i + 1} available`} />}
                          />
                          <span className="sm:hidden">Available</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="justify-self-end"
                          aria-label={`Remove portion ${i + 1}`}
                          onClick={() => remove(i)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    );
                  })}
                  {errors.portions?.message && <p className="text-xs text-destructive">{errors.portions.message}</p>}
                  {errors.portions?.root?.message && <p className="text-xs text-destructive">{errors.portions.root.message}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={addPortion} disabled={fields.length >= 20}>
                      <Plus /> Add portion
                    </Button>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        portionTotal > (capacity || 0) ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
                      )}
                    >
                      {portionTotal > (capacity || 0) && <TriangleAlert className="size-3.5" />}
                      Portions seat {portionTotal} of {capacity || 0} guests
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Turn a portion off to stop new bookings in it. Portions with active bookings can&apos;t be removed.
                  </p>
                </div>
              </>
            )}
          </div>

          <FormField label="Areas" htmlFor="h-areas" hint="Comma separated labels, e.g. Main Hall, Lawn" className="sm:col-span-2">
            <Input id="h-areas" className="h-9" {...register("areas")} />
          </FormField>
          <FormField label="Location" htmlFor="h-loc">
            <Input id="h-loc" className="h-9" placeholder="e.g. Block A, Ground floor" {...register("location")} />
          </FormField>
          <FormField label="Calendar colour">
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {HALL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => field.onChange(c)}
                      aria-label={`Colour ${c}`}
                      className={cn("size-7 rounded-full ring-offset-2 ring-offset-background transition", field.value === c && "ring-2 ring-foreground")}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              )}
            />
          </FormField>
          <FormField label="Description" htmlFor="h-desc" className="sm:col-span-2">
            <Textarea id="h-desc" rows={2} {...register("description")} />
          </FormField>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <Controller control={control} name="active" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            Active — available for new bookings
          </label>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="hall-form" disabled={isSubmitting}>{hall ? "Save changes" : "Add hall"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
