import {
  Bell,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { P } from "@/lib/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Shown when the user holds this permission anywhere; any of the list. */
  anyOf?: string[];
};

export type NavSection = { title?: string; items: NavItem[] };

/**
 * Only modules that are implemented appear here. Later phases add Tasks,
 * Social Media Calendar, Meta Ads, Google Ads, Creative Studio, Video
 * Production, SEO and Reports as they ship (no placeholder menu items).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Organization",
    items: [
      {
        title: "Companies",
        href: "/companies",
        icon: Building2,
        anyOf: [P.companiesView],
      },
      {
        title: "Projects",
        href: "/projects",
        icon: FolderKanban,
        anyOf: [P.projectsView],
      },
      {
        title: "Team",
        href: "/team",
        icon: Users,
        anyOf: [P.usersView, P.usersManage],
      },
    ],
  },
  {
    title: "Workspace",
    items: [
      { title: "Notifications", href: "/notifications", icon: Bell },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        anyOf: [
          P.settingsManage,
          P.rolesManage,
          P.departmentsManage,
          P.usersManage,
        ],
      },
    ],
  },
];
