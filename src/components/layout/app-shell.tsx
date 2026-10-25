"use client";

import { useEffect } from "react";
import { CloudOff, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const loadError = useStore((s) => s.loadError);
  const load = useStore((s) => s.load);
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggle = useStore((s) => s.toggleSidebar);

  useEffect(() => {
    useStore.persist.rehydrate();
    void useStore.getState().load();
  }, []);

  return (
    <div className="flex min-h-svh w-full">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar collapsed={collapsed} onToggleCollapse={toggle} />
        <main className="mx-auto w-full max-w-[1500px] flex-1 p-4 sm:p-6 print:max-w-none print:p-0">
          {hydrated ? (
            children
          ) : loadError ? (
            <EmptyState
              icon={CloudOff}
              title="Could not load your data"
              description={loadError}
              action={
                <Button onClick={() => void load()}>
                  <RotateCcw /> Try again
                </Button>
              }
            />
          ) : (
            <PageSkeleton />
          )}
        </main>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
