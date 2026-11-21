"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  PlusCircle,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Les entrées s'ajoutent au fil des phases.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Budget", icon: LayoutDashboard },
  { href: "/transactions", label: "Mouvements", icon: List },
  { href: "/transactions/nouveau", label: "Ajouter", icon: PlusCircle },
  { href: "/comptes", label: "Comptes", icon: Wallet },
  { href: "/parametres", label: "Réglages", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/transactions") {
    return pathname.startsWith("/transactions") && !pathname.startsWith("/transactions/nouveau");
  }
  return pathname.startsWith(href);
}

/** Barre du haut (ordinateur). */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex items-center gap-1">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
            isActive(pathname, item.href)
              ? "font-medium text-foreground"
              : "text-muted-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Barre du bas (mobile), toujours accessible au pouce. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px]",
                  active ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
