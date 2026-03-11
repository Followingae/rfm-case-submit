"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/case/new", icon: FilePlus2, label: "New Case" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (mobile: boolean) => (
    <nav
      className="flex flex-1 flex-col gap-0.5 px-3 pt-2"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={mobile ? () => setMobileOpen(false) : undefined}
            className={cn(
              "relative flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-card px-4 md:hidden">
        <span className="text-sm font-semibold">RFM</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out nav */}
      <div
        className={cn(
          "fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-border/40 bg-card transition-transform duration-200 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent(true)}
        <div className="border-t border-border/40 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="w-full justify-start gap-3 rounded-md text-[13px] text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[var(--sidebar-width)] flex-col border-r border-border/40 bg-card md:flex">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 px-5">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            RFM
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-500">
            <Sparkles className="h-2.5 w-2.5" />
            AI
          </span>
        </div>

        {/* Nav */}
        {navContent(false)}

        {/* Bottom */}
        <div className="border-t border-border/40 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="w-full justify-start gap-3 rounded-md text-[13px] text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
