"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "🏠" },
  { name: "Start Trip", href: "/trip", icon: "🚗" },
  { name: "Manual Entry", href: "/manual-trip", icon: "✏️" },
  { name: "History", href: "/history", icon: "📋" },
  { name: "My Car", href: "/car", icon: "🔧" },
  { name: "Chit Fund", href: "/chitfund", icon: "💰" },
  { name: "Transfers", href: "/transfers", icon: "💸" },
  { name: "Community", href: "/community", icon: "💬" },
  { name: "Import", href: "/import", icon: "📥" },
  { name: "Export", href: "/export", icon: "📤" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg"
      >
        <span className="text-xl">☰</span>
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`lg:hidden fixed left-0 top-0 h-full w-72 bg-white z-50 transform transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
      </div>

      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200">
        <SidebarContent pathname={pathname} onNavigate={() => {}} onLogout={handleLogout} />
      </div>
    </>
  );
}

function SidebarContent({ pathname, onNavigate, onLogout }: { pathname: string; onNavigate: () => void; onLogout: () => void }) {
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-xl">🚗</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">TripLog</h1>
            <p className="text-xs text-slate-500">ATO Logbook</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive(item.href) ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
          <span className="text-xl">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
