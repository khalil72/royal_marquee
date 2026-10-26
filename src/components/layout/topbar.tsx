"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Sun, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBookingViews } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { BrandMark, SidebarNav, SidebarProfile } from "./sidebar";
import { NAV_ITEMS } from "./nav";

export function Topbar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6 print:hidden">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </Button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="truncate">Search bookings, customers…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu />
        <Button asChild size="lg" className="hidden sm:inline-flex">
          <Link href="/bookings/new">
            <Plus /> New Booking
          </Link>
        </Button>
        <Button asChild size="icon-lg" className="sm:hidden" aria-label="New booking">
          <Link href="/bookings/new">
            <Plus />
          </Link>
        </Button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <BrandMark />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
          <SidebarProfile />
        </SheetContent>
      </Sheet>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

function UserMenu() {
  const logout = useStore((s) => s.logout);
  const businessName = useStore((s) => s.settings.businessName);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Account">
          <UserRound />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">Administrator</p>
          <p className="truncate text-xs text-muted-foreground">{businessName}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const views = useBookingViews();
  const customers = useStore((s) => s.customers);
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search bookings and customers">
      <CommandInput placeholder="Type a booking number, customer, mobile or event…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Bookings">
          {views.slice(0, 50).map((v) => (
            <CommandItem
              key={v.booking.id}
              value={`${v.booking.bookingNumber} ${v.booking.event.title} ${v.customer?.name ?? ""} ${v.customer?.mobile ?? ""}`}
              onSelect={() => go(`/bookings/${v.booking.id}`)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{v.booking.event.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {v.booking.bookingNumber} · {v.customer?.name} · {formatDate(v.booking.event.date)}
                </p>
              </div>
              <StatusBadge status={v.booking.status} />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Customers">
          {customers.slice(0, 30).map((c) => (
            <CommandItem key={c.id} value={`customer ${c.name} ${c.mobile}`} onSelect={() => go(`/customers/${c.id}`)}>
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.mobile}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((n) => (
            <CommandItem key={n.href} value={`page ${n.title}`} onSelect={() => go(n.href)}>
              <n.icon /> {n.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
