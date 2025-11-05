"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/shadcn/ui/sidebar";
import { navigationLinks } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Bot,
  Ticket,
  FileText,
  Settings,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Bot,
  Ticket,
  FileText,
  Settings,
};

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar
      className={cn(
        "fixed left-[70px] top-0 h-screen w-[250px] z-10 border-r border-gray-200",
        className
      )}
      collapsible="none"
      style={
        {
          "--sidebar-width": "250px",
        } as React.CSSProperties
      }
    >
      <SidebarContent>
        <SidebarGroup>
          <div className="sidebar-title pb-4 pt-[1px] px-2">
            <h1 className="text-xl font-bold">Help Desk</h1>
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigationLinks.map((item) => {
                const IconComponent =
                  iconMap[item.icon as keyof typeof iconMap];
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/");

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        {IconComponent && <IconComponent className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          Eclipse Support Center v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
