"use client";

import DashboardGlobalSidebar from "./DashboardGlobalSidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { SidebarProvider } from "@/components/shadcn/ui/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="h-screen w-full">
        {/* Header spans full width */}
        {/* <DashboardHeader user={user} /> */}

        {/* Fixed sidebars - full height */}
        <DashboardGlobalSidebar />
        <DashboardSidebar />

        {/* Main content - accounts for both sidebars (70px + 250px = 320px) */}
        <main className="ml-[320px] h-screen overflow-auto p-10">
          <div className="mx-auto max-w-8xl">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
