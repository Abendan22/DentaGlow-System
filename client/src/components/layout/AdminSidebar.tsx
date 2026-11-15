"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getNavItems } from "@/lib/navigation";

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = getNavItems(user?.role ?? "admin");

  return (
    <aside
      style={{ background: "var(--sidebar)" }}
      className="w-64 h-screen sticky top-0 flex flex-col flex-shrink-0"
    >
              <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
              <img 
                src="/tapazlogo.png" 
                alt="Tapaz Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">
                DentaGlow
              </div>
              <div className="text-blue-400 text-xs tracking-widest uppercase">
                Tapaz LGU Clinic
              </div>
            </div>
          </div>
        </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
