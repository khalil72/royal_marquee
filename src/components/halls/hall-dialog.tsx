"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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

const hallSchema = z.object({
  name: z.string().trim().min(2, "Hall name is required"),
  areas: z.string(),
  capacity: z.number({ error: "Enter capacity" }).int().min(1, "Capacity must be at least 1"),
  baseRent: z.number({ error: "Enter rent" }).min(0, "Cannot be negative"),
  location: z.string(),
  description: z.string(),
  color: z.string(),
  active: z.boolean(),
});
type HallValues = z.infer<typeof hallSchema>;

export function HallDialog({ open, onOpenChange, hall }: { open: boolean; onOpenChange: (o: boolean) => void; hall?: Hall | null }) {
  const addHall = useStore((s) => s.addHall);
  const updateHall = useStore((s) => s.updateHall);
  const hallCount = useStore((s) => s.halls.length);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HallValues>({ resolver: zodResolver(hallSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      hall
        ? { ...hall, areas: hall.areas.join(", "), location: hall.location ?? "", description: hall.description ?? "" }
        : { name: "", areas: "", capacity: 300, baseRent: 0, location: "", description: "", color: HALL_COLORS[hallCount % HALL_COLORS.length], active: true },
    );
  }, [open, hall, hallCount, reset]);

  const onSubmit = async (v: HallValues) => {
    const input = { ...v, areas: v.areas.split(",").map((a) => a.trim()).filter(Boolean) };
    const result = await (hall ? updateHall(hall.id, input) : addHall(input));
    if (!result.ok) return toast.error(result.error);
    toast.success(hall ? "Hall updated" : "Hall added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{hall ? "Edit hall / venue" : "Add hall / venue"}</DialogTitle>
          <DialogDescription>Each hall is booked independently, so different halls can host events at the same time.</DialogDescription>
        </DialogHeader>
        <form id="hall-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Hall / marquee name" htmlFor="h-name" required error={errors.name?.message} className="sm:col-span-2">
            <Input id="h-name" className="h-9" aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="Capacity (guests)" htmlFor="h-cap" required error={errors.capacity?.message}>
            <Input id="h-cap" type="number" min={1} className="h-9" aria-invalid={!!errors.capacity} {...register("capacity", { setValueAs: numberValue })} />
          </FormField>
          <FormField label="Base rent" htmlFor="h-rent" error={errors.baseRent?.message} hint="Pre-filled on new bookings">
            <MoneyInput id="h-rent" {...register("baseRent", { setValueAs: numberValue })} />
          </FormField>
          <FormField label="Areas" htmlFor="h-areas" hint="Comma separated, e.g. Main Hall, Lawn" className="sm:col-span-2">
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
