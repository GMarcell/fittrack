"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; transitionType: string };

const DESKTOP_LINKS: NavItem[] = [
  { href: "/", label: "Dashboard", transitionType: "nav-back" },
  { href: "/sessions", label: "Sessions", transitionType: "nav-forward" },
  { href: "/quests", label: "Quests", transitionType: "nav-forward" },
  { href: "/benchmarks", label: "Benchmarks", transitionType: "nav-forward" },
  { href: "/goals", label: "Goals", transitionType: "nav-forward" },
  { href: "/stats", label: "Stats", transitionType: "nav-forward" },
];

type MobileTab = NavItem & { icon: string };

const MOBILE_TABS: MobileTab[] = [
  { href: "/", label: "Home", icon: "⊞", transitionType: "nav-back" },
  { href: "/quests", label: "Quests", icon: "⚔", transitionType: "nav-forward" },
  { href: "/sessions/new", label: "Log", icon: "＋", transitionType: "nav-forward" },
  { href: "/benchmarks", label: "Benchmarks", icon: "📊", transitionType: "nav-forward" },
  { href: "/goals", label: "Goals", icon: "◎", transitionType: "nav-forward" },
  { href: "/stats", label: "Stats", icon: "↗", transitionType: "nav-forward" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <div className="hidden sm:flex items-center gap-1">
      {DESKTOP_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          transitionTypes={[link.transitionType]}
          className={cn(
            "text-sm transition-colors px-3 py-1.5 rounded-md",
            isActive(link.href, pathname)
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function MobileTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border sm:hidden z-50">
      <div className="grid grid-cols-6 h-14">
        {MOBILE_TABS.map((tab) => {
          const active = isActive(tab.href, pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              transitionTypes={[tab.transitionType]}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors relative",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
              <span className="text-base">{tab.icon}</span>
              <span className="text-[9px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
