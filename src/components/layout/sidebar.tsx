"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { authApi } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, isActive } from "./nav";

export function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  const settings = useStore((s) => s.settings);
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm">
        {settings.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo} alt="" className="size-full object-cover" />
        ) : (
          <Crown className="size-5" />
        )}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{settings.businessName}</p>
          <p className="truncate text-xs text-muted-foreground">{settings.tagline}</p>
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <item.icon
              className={cn(
                "size-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-sidebar-accent-foreground",
                active && "text-sidebar-primary",
              )}
            />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </Link>
        );
        if (!collapsed) return link;
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex print:hidden",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center border-b px-4", collapsed && "justify-center px-0")}>
        <Link href="/" aria-label="Dashboard">
          <BrandMark collapsed={collapsed} />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav collapsed={collapsed} />
      </div>
      <SidebarProfile collapsed={collapsed} />
    </aside>
  );
}

/** Signed-in user and a sign-out button, pinned to the bottom of the sidebar. */
export function SidebarProfile({ collapsed = false }: { collapsed?: boolean }) {
  const logout = useStore((s) => s.logout);
  const [username, setUsername] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void authApi.me().then((r) => {
      if (!cancelled && r.ok) setUsername(r.data.username);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = () => {
    setSigningOut(true);
    void logout();
  };

  const avatar = (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
      {(username ?? "A").charAt(0)}
    </div>
  );

  const signOutButton = (
    <button
      type="button"
      onClick={signOut}
      disabled={signingOut}
      aria-label="Sign out"
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50",
        collapsed && "w-9 justify-center px-0",
      )}
    >
      <LogOut className="size-4 shrink-0" />
      {!collapsed && <span>Sign out</span>}
    </button>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t p-3">
        <Tooltip>
          <TooltipTrigger asChild>{avatar}</TooltipTrigger>
          <TooltipContent side="right">{username ?? "Administrator"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>{signOutButton}</TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{username ?? "…"}</p>
          <p className="truncate text-xs text-muted-foreground">Administrator</p>
        </div>
      </div>
      <div className="mt-1">{signOutButton}</div>
    </div>
  );
}
