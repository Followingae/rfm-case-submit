"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  Clock,
  BarChart3,
  Settings,
  Sun,
  Moon,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", active: true },
  { href: "/case/new", icon: FilePlus2, label: "New Case", active: true },
  { href: "#", icon: Clock, label: "History", active: false },
  { href: "#", icon: BarChart3, label: "Analytics", active: false },
  { href: "#", icon: Settings, label: "Settings", active: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/50 bg-card/80 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <CreditCard className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">RFM Case Submit</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out nav */}
      <div
        className={cn(
          "fixed right-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-56 flex-col border-l border-border/50 bg-card p-4 transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) && item.href !== "#";

            return item.active ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ) : (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/40"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                <span className="ml-auto text-[10px]">Soon</span>
              </div>
            );
          })}
        </nav>
        <Separator className="my-3" />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="justify-start gap-3 rounded-xl"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[72px] flex-col items-center border-r border-border/50 bg-card/80 py-6 backdrop-blur-xl md:flex">
        <div className="mb-8 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <CreditCard className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        <nav className="flex flex-1 flex-col items-center gap-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) && item.href !== "#";

            return (
              <Tooltip key={item.label} delayDuration={0}>
                <TooltipTrigger asChild>
                  {item.active ? (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  ) : (
                    <div className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl text-muted-foreground/40">
                      <item.icon className="h-5 w-5" />
                    </div>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  <p>
                    {item.label}
                    {!item.active && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        Coming Soon
                      </span>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-3">
          <Separator className="w-8" />
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="h-10 w-10 rounded-xl"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              <p>Toggle Theme</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </>
  );
}
