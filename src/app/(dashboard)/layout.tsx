import { Suspense } from "react";
import { AppShell, PageSkeleton } from "@/components/layout/app-shell";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="p-6"><PageSkeleton /></div>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
