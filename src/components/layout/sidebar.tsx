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

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-card px-4 md:hidden">
        <span className="text-sm font-semibold tracking-tight">RFM Portal</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={toggle}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile slide-out nav ── */}
      <div
        className={cn(
          "fixed left-0 top-14 z-40 flex h-[calc(100dvh-3.5rem)] w-64 flex-col border-r border-border/40 bg-card transition-transform duration-200 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/8 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Desktop sidebar — fixed left, full height ── */}
      <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-[var(--sidebar-width)] flex-col border-r border-border/30 bg-card md:flex">
        {/* Brand */}
        <div className="flex h-14 items-center px-5">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            RFM Portal
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-primary/8 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border/30 p-3 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="w-full justify-start gap-3 rounded-lg text-[13px] text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </Button>
          <div className="px-3">
            <span className="text-[10px] text-muted-foreground/40">Powered by Google Gemini</span>
          </div>
        </div>
      </aside>
    </>
  );
}
