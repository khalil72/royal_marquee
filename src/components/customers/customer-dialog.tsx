"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useStore } from "@/lib/store";
import type { Customer } from "@/lib/types";
import { customerSchema, type CustomerFormValues } from "@/lib/validation";

const empty: CustomerFormValues = { name: "", mobile: "", whatsapp: "", email: "", address: "", cnic: "", notes: "" };

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}) {
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({ resolver: zodResolver(customerSchema), defaultValues: empty });

  useEffect(() => {
    if (open) {
      reset(
        customer
          ? {
              name: customer.name,
              mobile: customer.mobile,
              whatsapp: customer.whatsapp ?? "",
              email: customer.email ?? "",
              address: customer.address,
              cnic: customer.cnic ?? "",
              notes: customer.notes ?? "",
            }
          : empty,
      );
    }
  }, [open, customer, reset]);

  const onSubmit = async (v: CustomerFormValues) => {
    const result = await (customer ? updateCustomer(customer.id, v) : addCustomer(v));
    if (!result.ok) return toast.error(result.error);
    toast.success(customer ? "Customer updated" : "Customer added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>Customers are matched by mobile number to avoid duplicates.</DialogDescription>
        </DialogHeader>
        <form id="customer-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="cu-name" required error={errors.name?.message}>
            <Input id="cu-name" className="h-9" aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="Mobile number" htmlFor="cu-mobile" required error={errors.mobile?.message}>
            <Input id="cu-mobile" className="h-9" inputMode="tel" placeholder="0300-1234567" aria-invalid={!!errors.mobile} {...register("mobile")} />
          </FormField>
          <FormField label="WhatsApp number" htmlFor="cu-wa" error={errors.whatsapp?.message}>
            <Input id="cu-wa" className="h-9" inputMode="tel" aria-invalid={!!errors.whatsapp} {...register("whatsapp")} />
          </FormField>
          <FormField label="Email" htmlFor="cu-email" error={errors.email?.message}>
            <Input id="cu-email" type="email" className="h-9" aria-invalid={!!errors.email} {...register("email")} />
          </FormField>
          <FormField label="Address" htmlFor="cu-address" required error={errors.address?.message} className="sm:col-span-2">
            <Input id="cu-address" className="h-9" aria-invalid={!!errors.address} {...register("address")} />
          </FormField>
          <FormField label="CNIC" htmlFor="cu-cnic" error={errors.cnic?.message}>
            <Input id="cu-cnic" className="h-9" placeholder="35202-1234567-1" aria-invalid={!!errors.cnic} {...register("cnic")} />
          </FormField>
          <FormField label="Notes" htmlFor="cu-notes" className="sm:col-span-2">
            <Textarea id="cu-notes" rows={2} {...register("notes")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="customer-form" disabled={isSubmitting}>{customer ? "Save changes" : "Add customer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
