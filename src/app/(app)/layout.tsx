"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { AppSidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MobileBlock } from "@/components/layout/mobile-block";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {/* Phone block screen — hidden on sm+ (640px) */}
      <MobileBlock />

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
