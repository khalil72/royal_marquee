"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import { FormField, MoneyInput, numberValue } from "@/components/shared/form-field";
import { formatMoney } from "@/lib/format";
import type { BookingView } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { PAYMENT_METHODS, type Payment } from "@/lib/types";
import { paymentSchema, type PaymentFormValues } from "@/lib/validation";

export function PaymentDialog({
  view,
  open,
  onOpenChange,
  onRecorded,
}: {
  view: BookingView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: (payment: Payment) => void;
}) {
  const settings = useStore((s) => s.settings);
  const addPayment = useStore((s) => s.addPayment);
  const remaining = Math.max(0, view.summary.remaining);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: remaining,
      date: format(new Date(), "yyyy-MM-dd"),
      method: "Cash",
      kind: view.summary.totalPaid > 0 ? "Additional" : "Advance",
      reference: "",
      note: "",
    },
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (open) {
      reset({
        amount: remaining,
        date: format(new Date(), "yyyy-MM-dd"),
        method: "Cash",
        kind: view.summary.totalPaid > 0 ? "Additional" : "Advance",
        reference: "",
        note: "",
      });
    }
    // Reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const amount = useWatch({ control, name: "amount" }) || 0;
  const exceeds = !settings.allowOverpayment && amount > remaining;

  const onSubmit = async (v: PaymentFormValues) => {
    const result = await addPayment(view.booking.id, v);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Payment of ${formatMoney(v.amount, settings.currency)} recorded`, {
      description: `Receipt ${result.data.receiptNumber}`,
    });
    onOpenChange(false);
    onRecorded?.(result.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            {view.booking.bookingNumber} · {view.customer?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Grand total</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(view.totals.grandTotal, settings.currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid</p>
            <p className="mt-0.5 font-semibold text-success tabular-nums">{formatMoney(view.summary.totalPaid, settings.currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Outstanding</p>
            <p className="mt-0.5 font-semibold text-destructive tabular-nums">{formatMoney(remaining, settings.currency)}</p>
          </div>
        </div>
        <form id="payment-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Amount"
            htmlFor="pay-amount"
            required
            error={errors.amount?.message ?? (exceeds ? `Cannot exceed outstanding balance of ${formatMoney(remaining, settings.currency)}` : undefined)}
          >
            <MoneyInput id="pay-amount" prefix={settings.currency} invalid={!!errors.amount || exceeds} {...register("amount", { setValueAs: numberValue })} />
          </FormField>
          <FormField label="Payment date" required error={errors.date?.message}>
            <Controller control={control} name="date" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
          </FormField>
          <FormField label="Payment method" required>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9! w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Payment type">
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9! w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Advance">Advance</SelectItem>
                    <SelectItem value="Additional">Additional payment</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Reference / transaction ID" htmlFor="pay-ref" className="sm:col-span-2">
            <Input id="pay-ref" className="h-9" placeholder="Bank ref, JazzCash TID, cheque no." {...register("reference")} />
          </FormField>
          <FormField label="Note" htmlFor="pay-note" className="sm:col-span-2">
            <Input id="pay-note" className="h-9" placeholder="Optional" {...register("note")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" disabled={isSubmitting || exceeds || (remaining <= 0 && !settings.allowOverpayment)}>
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
