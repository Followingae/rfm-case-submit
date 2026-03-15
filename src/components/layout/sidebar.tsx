"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  Settings,
  Sun,
  Moon,
  FolderOpen,
  BarChart3,
  Users,
  LogOut,
  Inbox,
  Building2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: UserRole[];
}

const allNavItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/case/new", icon: FilePlus2, label: "New Case", roles: ["sales", "superadmin"] },
  { href: "/cases/queue", icon: Inbox, label: "Queue", roles: ["processing", "superadmin"] },
  { href: "/cases", icon: FolderOpen, label: "Cases" },
  { href: "/merchants", icon: Building2, label: "Merchants", roles: ["processing", "management", "superadmin"] },
  { href: "/expiries", icon: AlertTriangle, label: "Expiries", roles: ["processing", "management", "superadmin"] },
  { href: "/analytics", icon: BarChart3, label: "Analytics", roles: ["management", "superadmin"] },
  { href: "/reports", icon: FileText, label: "Reports", roles: ["management", "superadmin"] },
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

export function AppSidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { user, signOut, hasRole } = useAuth();

  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return hasRole(...item.roles);
  });

  return (
    <SidebarPrimitive>
      {/* ── Header: Logo ── */}
      <SidebarHeader className="px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/rfm-logo.jpg" alt="RFM Loyalty" className="h-5" />
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/40">Portal</span>
        </Link>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer: User + actions ── */}
      <SidebarFooter>
        <SidebarSeparator />

        {/* Gemini badge */}
        <div className="flex items-center gap-1.5 px-2 py-1">
          <img src="/gemini-logo.png" alt="Gemini" className="h-3 w-3" />
          <span className="text-[10px] text-sidebar-foreground/40">Powered by Google Gemini</span>
        </div>

        {/* Theme toggle */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggle} tooltip={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        {/* User */}
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                  {user.fullName
                    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                    : user.email[0].toUpperCase()}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.fullName || user.email}</span>
                  <Badge
                    className={cn(
                      "mt-0.5 w-fit text-[9px] font-medium border-0 px-1.5 py-0 h-4",
                      ROLE_COLORS[user.role] || ""
                    )}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} tooltip="Sign Out" className="text-sidebar-foreground/60 hover:text-red-500">
                <LogOut />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
