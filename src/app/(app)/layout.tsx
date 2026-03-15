"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { AppSidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SidebarProvider className="h-dvh !min-h-0 overflow-hidden">
        <AppSidebar />
        <SidebarInset className="h-dvh !min-h-0 overflow-hidden">
          <TopBar />
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
