"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, Sun, Moon, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";
import { NotificationCenter } from "./notification-center";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  sales: "Sales",
  processing: "Processing",
  management: "Management",
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  sales: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  processing: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  management: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function useCurrentDate() {
  const [date, setDate] = useState(new Date());
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timeout = setTimeout(() => setDate(new Date()), msUntilMidnight + 100);
    return () => clearTimeout(timeout);
  }, [date]);
  return date;
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = useCurrentDate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formattedDate = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/30 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Date + role */}
      <div className="hidden md:flex items-center gap-2.5 min-w-0">
        <span className="text-xs text-muted-foreground truncate">{formattedDate}</span>
        {user && (
          <span className={cn(
            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
            ROLE_COLORS[user.role] || ""
          )}>
            {ROLE_LABELS[user.role] || user.role}
          </span>
        )}
      </div>

      {/* Right side */}
      {user && (
        <div className="ml-auto flex items-center gap-1">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={toggle}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <NotificationCenter />

          {/* User dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {initials}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-foreground truncate max-w-[140px]">
                {user.fullName || user.email}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {open && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-border/50 bg-card p-1.5 shadow-lg">
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.fullName || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {user.email}
                  </p>
                  <div className={cn(
                    "mt-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                    ROLE_COLORS[user.role] || ""
                  )}>
                    {ROLE_LABELS[user.role] || user.role}
                  </div>
                </div>
                <div className="border-t border-border/30 mt-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setOpen(false); signOut(); }}
                    className="w-full justify-start gap-2 rounded-lg text-xs text-muted-foreground hover:text-red-500"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
