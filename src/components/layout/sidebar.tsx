"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  FolderOpen,
  BarChart3,
  Users,
  Inbox,
  Building2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
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
];

export function AppSidebar() {
  const pathname = usePathname();
  const { hasRole } = useAuth();

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

      {/* ── Footer ── */}
      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-2 px-4 py-3">
          <img src="/gemini-logo.png" alt="Gemini" className="h-3.5 w-3.5 opacity-60" />
          <span className="text-[11px] text-sidebar-foreground/40">Powered by Google Gemini</span>
        </div>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
