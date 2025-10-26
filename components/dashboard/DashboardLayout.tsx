"use client";

import { DashboardHeader } from "./DashboardHeader";
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

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="grid h-screen w-full grid-rows-[auto_1fr]">
        {/* Header spans full width */}
        <DashboardHeader user={user} />

        {/* Content area with sidebar */}
        <div className="flex h-full overflow-hidden">
          <div className="w-[250px] max-w-[250px]">
            <DashboardSidebar className="w-full max-w-[250px]" />
          </div>

          <main className="w-[calc(100%-350px)] overflow-auto p-10 ">
            <div className="mx-auto max-w-8xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
