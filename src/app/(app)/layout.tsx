"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-dvh overflow-hidden bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden pt-14 md:pt-0 md:pl-[var(--sidebar-width)]">
            <TopBar />
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </AuthProvider>
  );
}
