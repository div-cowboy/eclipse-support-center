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
    title: "Support Chats",
    href: "/app/chats",
    icon: "MessageSquare",
  },
  {
    title: "Chatbots",
    href: "/app/chatbots",
    icon: "Bot",
  },
  {
    title: "Organizations",
    href: "/app/organizations",
    icon: "Building2",
  },
];
