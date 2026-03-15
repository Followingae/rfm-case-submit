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
  FolderOpen,
  BarChart3,
  Users,
  LogOut,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: UserRole[]; // if undefined, all roles can see it
}

const allNavItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/case/new", icon: FilePlus2, label: "New Case", roles: ["sales", "superadmin"] },
  { href: "/cases", icon: FolderOpen, label: "Cases" },
  { href: "/analytics", icon: BarChart3, label: "Analytics", roles: ["management", "superadmin"] },
  { href: "/admin/users", icon: Users, label: "Users", roles: ["superadmin"] },
  { href: "/settings", icon: Settings, label: "Settings" },
];

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

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { user, signOut, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter nav items by role
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return hasRole(...item.roles);
  });

  const renderNavLinks = (onNavigate?: () => void) =>
    navItems.map((item) => {
      const isActive =
        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
            isActive
              ? "bg-primary/8 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      );
    });

  const renderUserSection = () => {
    if (!user) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 px-3 py-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user.fullName
              ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : user.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {user.fullName || user.email}
            </p>
            <Badge
              className={cn(
                "mt-0.5 text-[9px] font-medium border-0 px-1.5 py-0 h-4",
                ROLE_COLORS[user.role] || ""
              )}
            >
              {ROLE_LABELS[user.role] || user.role}
            </Badge>
          </div>
        </div>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-3 rounded-lg text-[13px] text-muted-foreground hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  };

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
          {renderNavLinks(() => setMobileOpen(false))}
        </nav>
        <div className="border-t border-border/30 p-3">
          {renderUserSection()}
        </div>
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
          {renderNavLinks()}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border/30 p-3">
          {renderUserSection()}
          <div className="mt-2 px-3">
            <span className="text-[10px] text-muted-foreground/40">Powered by Google Gemini</span>
          </div>
        </div>
      </aside>
    </>
  );
}
