"use client";

import { useState } from "react";
import { Download, LoaderCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadElementAsPdf } from "@/lib/pdf";

export function PrintToolbar({
  targetRef,
  filename,
  children,
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    if (!targetRef.current) return;
    setBusy(true);
    try {
      await downloadElementAsPdf(targetRef.current, filename);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate the PDF. Use Print → Save as PDF instead.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {children}
      <Button variant="outline" size="lg" onClick={download} disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Download />} Download PDF
      </Button>
      <Button size="lg" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </>
  );
}
