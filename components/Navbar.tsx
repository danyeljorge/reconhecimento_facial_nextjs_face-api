"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, UserPlus, Users, Home, ScanFace, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  // No dashboard, a navegação é feita pela Sidebar lateral dedicada
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  const navLinks = [
    { href: "/", label: "Início", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cadastros", label: "Cadastros", icon: Users },
  ];


  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition border border-indigo-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                Reconhecimento Facial
                <span className="text-[10px] px-2 py-0.5 font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  MVP
                </span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
