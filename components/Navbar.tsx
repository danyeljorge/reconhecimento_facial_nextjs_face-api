"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, UserPlus, Users, Home, ScanFace } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Início", icon: Home },
    { href: "/reconhecer", label: "Reconhecimento Facial", icon: ScanFace, highlight: true },
    { href: "/cadastro", label: "Cadastrar Pessoa", icon: UserPlus },
    { href: "/cadastros", label: "Ver Cadastros", icon: Users },
  ];

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition border border-indigo-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
                Reconhecimento Facial
                <span className="text-xs px-2 py-0.5 font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Ativo
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                      : link.highlight
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
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
