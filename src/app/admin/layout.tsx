"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Star, ArrowLeft, UserCircle, CreditCard, DollarSign } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/profesionales", label: "Profesionales", icon: Users },
  { href: "/admin/usuarios", label: "Usuarios", icon: UserCircle },
  { href: "/admin/resenas", label: "Reseñas", icon: Star },
  { href: "/admin/suscripciones", label: "Suscripciones", icon: CreditCard },
  { href: "/admin/pagos", label: "Pagos", icon: DollarSign },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-border bg-card md:block">
        <div className="p-6">
          <h2 className="text-lg font-bold text-navy">Panel de Admin</h2>
        </div>
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-navy text-white"
                    : "text-text-light hover:bg-surface hover:text-navy"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 border-t border-border px-3 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-light hover:bg-surface hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al sitio
          </Link>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto p-6">
        {/* Navegación móvil */}
        <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-navy text-white"
                    : "border border-border bg-card text-text-light hover:border-navy/30"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
