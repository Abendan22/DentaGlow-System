"use client";

import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { Calendar, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "patient")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "patient") return null;

  const nav = [
    { href: "/portal", label: "Book Appointment", icon: Calendar },
    { href: "/portal/my-appointments", label: "My Appointments", icon: User },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white-100 flex items-center justify-center overflow-hidden">
                <img 
                  src="/tapazlogo.png" 
                  alt="Tapaz Logo" 
                  className="w-full h-full object-cover" 
                />
              </div>
            <div>
              <div className="font-bold text-slate-800">DentaFlow</div>
              <div className="text-xs text-blue-500">Patient Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === href
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <div className="avatar text-xs">{getInitials(user.name)}</div>
              <span className="text-sm text-slate-600 hidden sm:block">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-500 transition-colors ml-2"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
