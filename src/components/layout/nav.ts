import {
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Event Bookings", href: "/bookings", icon: ClipboardList },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Halls & Venues", href: "/halls", icon: Building2 },
  { title: "Invoices", href: "/invoices", icon: FileText },
  { title: "Payments", href: "/payments", icon: Wallet },
  { title: "Reports", href: "/reports", icon: ChartColumn },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
