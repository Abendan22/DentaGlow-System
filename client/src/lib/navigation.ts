import {
  Activity,
  Banknote,
  BarChart3,
  Calendar,
  ClipboardList,
  Heart,
  LayoutDashboard,
  Package,
  Receipt,
  Stethoscope,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import type { User } from "./types";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const coreAdmin: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/gender", label: "Gender", icon: Heart },
  { href: "/admin/patients", label: "Patient Record", icon: Users },
  { href: "/admin/users", label: "User Management", icon: UserCog },
  { href: "/admin/doctors", label: "Dental Doctor", icon: Stethoscope },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/staff", label: "Staff", icon: ClipboardList },
  { href: "/admin/appointments", label: "Appointment", icon: Calendar },
];

const billingNav: NavItem[] = [
  { href: "/admin/billable-items", label: "Billable Items", icon: Package },
  { href: "/admin/billing", label: "Billing", icon: Receipt },
];

const reportsNav: NavItem[] = [
  { href: "/admin/reports", label: "MHO Reports", icon: BarChart3 },
  { href: "/admin/activity-logs", label: "Activity Logs", icon: Activity },
];

export function getNavItems(role: User["role"]): NavItem[] {
  switch (role) {
    case "treasurer":
      return [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/treasurer", label: "Treasurer", icon: Banknote },
      ];
    case "staff":
    case "doctor":
      return [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/appointments", label: "Appointment", icon: Calendar },
        { href: "/admin/patients", label: "Patient Record", icon: Users },
        ...billingNav,
      ];
    case "admin":
    default:
      return [...coreAdmin, ...billingNav, ...reportsNav];
  }
}
