"use client";

import {
  LayoutDashboard,
  AlertTriangle,
  Inbox,
  Activity,
  PlaySquare,
  BarChart3,
  Settings,
  Blocks,
  Database,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const monitor = [
  { title: "Dashboard",     url: "/", icon: LayoutDashboard },
  { title: "Alerts",        url: "/alerts", icon: AlertTriangle },
  { title: "Incidents",     url: "/incidents", icon: Inbox },
  { title: "System Health", url: "/system-health", icon: Activity },
  { title: "Reports",       url: "/reports", icon: BarChart3 },
];

const integrations = [
  { title: "Integrations", url: "#", icon: Blocks },
  { title: "Sources",      url: "#", icon: Database },
];

const lab = [
  { title: "Simulation",   url: "/simulation", icon: PlaySquare },
  { title: "Benchmarking", url: "/benchmarking", icon: BarChart3 },
];

const AppSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="p-3 border-r-0">
      <div className="rounded-2xl bg-sidebar h-full flex flex-col overflow-hidden">
        <SidebarHeader className="px-5 pt-6 pb-4">
          <Link href="/" className="block">
            <Image
              src="/nexa-logo.png"
              alt="NEXA"
              width={140}
              height={40}
              priority
              className="h-9 w-auto object-contain dark:invert"
            />
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-3 gap-5">
          <NavGroup label="Workspace" items={monitor} pathname={pathname} />
          <NavGroup label="Integrations" items={integrations} pathname={pathname} />
          <NavGroup label="Lab" items={lab} pathname={pathname} />
        </SidebarContent>

        <SidebarFooter className="px-3 pb-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Settings"
                className="h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground data-[active=true]:bg-foreground data-[active=true]:text-background"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: { title: string; url: string; icon: React.ElementType }[];
  pathname?: string | null;
}) {
  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url !== "#" &&
              (pathname === item.url ||
                (item.url !== "/" && pathname?.startsWith(item.url)));
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className="h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:hover:bg-foreground data-[active=true]:hover:text-background"
                >
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4" strokeWidth={2} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default AppSidebar;
