export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  isActive?: boolean;
}

export const navigationLinks: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/app",
    icon: "LayoutDashboard",
  },
  {
    title: "Chats and chatbots",
    href: "/app/chats",
    icon: "MessageSquare",
  },
  {
    title: "Organizations",
    href: "/app/organizations",
    icon: "Building2",
  },
];
