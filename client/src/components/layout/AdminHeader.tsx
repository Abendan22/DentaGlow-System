"use client";

import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

const roleLabel: Record<string, string> = {
  admin: "Admin",
  doctor: "Doctor",
  staff: "Staff",
  treasurer: "Treasurer",
  patient: "Patient",
};

export function AdminHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header
      className="px-8 py-4 flex items-center justify-between border-b border-white/10"
      style={{ background: "var(--sidebar)" }}
    >
      <div className="text-slate-400 text-sm hidden sm:block">
        DentaGlow System Management Platform by: Tapaz capiz Lgu. Inc.
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium text-white">
            {roleLabel[user?.role ?? ""] ?? user?.role}, {user?.name}
          </div>
        </div>
        <div
          className="avatar"
          style={{ background: "var(--primary-light)" }}
        >
          {getInitials(user?.name || "SA")}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
