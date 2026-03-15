"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

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

export function TopBar() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/30 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Right side: user dropdown */}
      {user && (
        <div className="ml-auto relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {user.fullName
                ? user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : user.email[0].toUpperCase()}
            </div>
            <span className="hidden sm:inline max-w-[120px] truncate text-sm font-medium text-foreground">
              {user.fullName || user.email}
            </span>
            <Badge
              className={cn(
                "hidden sm:inline-flex text-[10px] font-medium border-0 px-1.5 py-0",
                ROLE_COLORS[user.role] || ""
              )}
            >
              {ROLE_LABELS[user.role] || user.role}
            </Badge>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border/40 bg-card p-1 shadow-lg">
              <div className="border-b border-border/30 px-3 py-2">
                <p className="text-xs font-medium text-foreground truncate">
                  {user.fullName || user.email}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="mt-1 w-full justify-start gap-2 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
