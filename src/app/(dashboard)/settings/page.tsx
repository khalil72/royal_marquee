"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Crown,
  Database,
  Download,
  FileText,
  Percent,
  RotateCcw,
  Save,
  ScrollText,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField, MoneyInput, SectionCard, numberValue } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { exportData, useStore } from "@/lib/store";
import type { AppData } from "@/lib/types";
import { settingsSchema, type SettingsValues } from "@/lib/validation";

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const importData = useStore((s) => s.importData);
  const resetData = useStore((s) => s.resetData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<null | "demo" | "clear">(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsValues>({ resolver: zodResolver(settingsSchema), defaultValues: settings });

  const logo = useWatch({ control, name: "logo" });
  const taxEnabled = useWatch({ control, name: "taxEnabled" });

  const onSubmit = async (v: SettingsValues) => {
    // JSON drops undefined, so a removed logo must be sent as null
    const result = await updateSettings({ ...v, logo: v.logo ?? null });
    if (!result.ok) return toast.error(result.error);
    reset(useStore.getState().settings);
    toast.success("Settings saved");
  };

  const onLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > 600 * 1024) return toast.error("Logo must be smaller than 600 KB.");
    const reader = new FileReader();
    reader.onload = () => setValue("logo", String(reader.result), { shouldDirty: true });
    reader.readAsDataURL(file);
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marquee-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const restoreBackup = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as AppData;
      const r = await importData(data);
      if (!r.ok) return toast.error(r.error);
      reset(useStore.getState().settings);
      toast.success("Backup restored");
    } catch {
      toast.error("Could not read the backup file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error("Please fix the highlighted fields."))} noValidate>
      <PageHeader
        title="Business Settings"
        description="Business profile, invoicing, tax, payment methods and policies."
        actions={
          <Button type="submit" size="lg" disabled={!isDirty}>
            <Save /> Save settings
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard icon={Building2} title="Business profile" className="xl:col-span-2">
          <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-32 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Business logo" className="size-full object-contain" />
                ) : (
                  <Crown className="size-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <label className="cursor-pointer">
                    <Upload /> Upload logo
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
                  </label>
                </Button>
                {logo && (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove logo" onClick={() => setValue("logo", undefined, { shouldDirty: true })}>
                    <X />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Business name" htmlFor="s-name" required error={errors.businessName?.message}>
                <Input id="s-name" className="h-9" {...register("businessName")} />
              </FormField>
              <FormField label="Tagline" htmlFor="s-tag">
                <Input id="s-tag" className="h-9" {...register("tagline")} />
              </FormField>
              <FormField label="Phone" htmlFor="s-phone" required error={errors.phone?.message}>
                <Input id="s-phone" className="h-9" {...register("phone")} />
              </FormField>
              <FormField label="Email" htmlFor="s-email" error={errors.email?.message}>
                <Input id="s-email" className="h-9" {...register("email")} />
              </FormField>
              <FormField label="Website" htmlFor="s-web">
                <Input id="s-web" className="h-9" {...register("website")} />
              </FormField>
              <FormField label="NTN / tax number" htmlFor="s-ntn">
                <Input id="s-ntn" className="h-9" {...register("ntn")} />
              </FormField>
              <FormField label="Address" htmlFor="s-addr" required error={errors.address?.message} className="sm:col-span-2">
                <Input id="s-addr" className="h-9" {...register("address")} />
              </FormField>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={FileText} title="Invoicing & numbering" description="Numbers increase automatically and are always unique.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Default currency" htmlFor="s-cur" required error={errors.currency?.message}>
              <Input id="s-cur" className="h-9" {...register("currency")} />
            </FormField>
            <div className="hidden sm:block" />
            <FormField label="Booking prefix" htmlFor="s-bp" hint="e.g. BK-2026-0001">
              <Input id="s-bp" className="h-9" {...register("bookingPrefix")} />
            </FormField>
            <FormField label="Next booking number" htmlFor="s-bn" error={errors.nextBookingNumber?.message}>
              <Input id="s-bn" type="number" min={1} className="h-9" {...register("nextBookingNumber", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Invoice prefix" htmlFor="s-ip">
              <Input id="s-ip" className="h-9" {...register("invoicePrefix")} />
            </FormField>
            <FormField label="Next invoice number" htmlFor="s-in" error={errors.nextInvoiceNumber?.message}>
              <Input id="s-in" type="number" min={1} className="h-9" {...register("nextInvoiceNumber", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Receipt prefix" htmlFor="s-rp">
              <Input id="s-rp" className="h-9" {...register("receiptPrefix")} />
            </FormField>
            <FormField label="Next receipt number" htmlFor="s-rn" error={errors.nextReceiptNumber?.message}>
              <Input id="s-rn" type="number" min={1} className="h-9" {...register("nextReceiptNumber", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Invoice footer" htmlFor="s-footer" className="sm:col-span-2">
              <Input id="s-footer" className="h-9" {...register("invoiceFooter")} />
            </FormField>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard icon={Percent} title="Tax & discounts">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm sm:col-span-2">
                <Controller control={control} name="taxEnabled" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                Apply tax on bookings
              </label>
              <FormField label="Default tax (%)" htmlFor="s-tax" error={errors.defaultTaxPercent?.message}>
                <MoneyInput id="s-tax" prefix="%" disabled={!taxEnabled} {...register("defaultTaxPercent", { setValueAs: numberValue })} />
              </FormField>
              <FormField label="Maximum discount (%)" htmlFor="s-disc" error={errors.maxDiscountPercent?.message}>
                <MoneyInput id="s-disc" prefix="%" {...register("maxDiscountPercent", { setValueAs: numberValue })} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard icon={Wallet} title="Payments">
            <label className="flex items-start gap-3 text-sm">
              <Controller control={control} name="allowOverpayment" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
              <span>
                Allow overpayments
                <span className="block text-xs text-muted-foreground">When off, payments cannot exceed the outstanding balance.</span>
              </span>
            </label>
          </SectionCard>
        </div>

        <SectionCard icon={ScrollText} title="Booking terms & cancellation policy" description="One item per line. Printed on every invoice." className="xl:col-span-2">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Booking terms & conditions" htmlFor="s-terms">
              <Textarea id="s-terms" rows={7} {...register("bookingTerms")} />
            </FormField>
            <FormField label="Standard cancellation policy" htmlFor="s-cancel">
              <Textarea id="s-cancel" rows={7} {...register("cancellationPolicy")} />
            </FormField>
          </div>
        </SectionCard>

        <p className="text-sm text-muted-foreground">
          Halls and venues are managed on the <Link href="/halls" className="text-primary hover:underline">Halls & Venues</Link> page.
        </p>

        <SectionCard icon={Database} title="Data & backup" description="Data is stored in your MongoDB database. Download a JSON backup any time.">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadBackup}><Download /> Download backup</Button>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Restore backup</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => restoreBackup(e.target.files?.[0])} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setConfirm("demo")}><RotateCcw /> Reload demo data</Button>
            <Button type="button" variant="destructive" onClick={() => setConfirm("clear")}><Trash2 /> Start fresh (erase all)</Button>
          </div>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "demo" ? "Replace all data with demo data?" : "Erase all data?"}
        description="This replaces every booking, customer, payment, invoice, hall and setting in the database. Download a backup first if you may need it. This cannot be undone."
        confirmLabel={confirm === "demo" ? "Load demo data" : "Erase everything"}
        destructive
        onConfirm={async () => {
          const r = await resetData(confirm === "demo");
          setConfirm(null);
          if (!r.ok) return toast.error(r.error);
          reset(useStore.getState().settings);
          toast.success(confirm === "demo" ? "Demo data loaded" : "All data erased");
        }}
      />
    </form>
  );
}
