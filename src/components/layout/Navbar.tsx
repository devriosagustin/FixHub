"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Search, User, Briefcase, LogOut, LayoutDashboard, UserCircle, MessageCircle, CreditCard, Bell, ClipboardList } from "lucide-react";
import { NotificationsBell } from "./NotificationsBell";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);
  const { data: session, status } = useSession();

  const estaAutenticado = status === "authenticated";
  const esAdmin = session?.user?.rol === "ADMIN";
  const esProfesional = session?.user?.rol === "PROFESIONAL";
  const esCliente = estaAutenticado && !esAdmin && !esProfesional;

  // Cargar mensajes no leídos cada 30 segundos (solo si está autenticado)
  useEffect(() => {
    if (!estaAutenticado) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/chat/unread");
        if (res.ok) {
          const data = await res.json();
          setNoLeidos(data.total || 0);
        }
      } catch {
        // Ignorar errores silenciosamente
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [estaAutenticado]);

  return (
    <header className="sticky top-0 z-50 bg-navy shadow-lg">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange font-bold text-white text-lg">
              FH
            </div>
            <span className="text-xl font-bold text-white">
              fix<span className="text-orange">hub</span>
            </span>
          </Link>

          {/* Links de escritorio */}
          <div className="hidden md:flex md:items-center md:gap-5">
            <Link
              href="/busqueda"
              className="flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              <Search className="h-4 w-4" />
              Buscar
            </Link>

            {estaAutenticado ? (
              <>
                {/* Link al chat con badge de no leídos */}
                <Link
                  href="/chat"
                  className="flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white relative"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat
                  {noLeidos > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-orange text-white text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                      {noLeidos > 99 ? "99+" : noLeidos}
                    </span>
                  )}
                </Link>

                {/* Si es admin, mostrar link al panel */}
                {esAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin
                  </Link>
                )}

                {/* Si es cliente (no profesional), ofrecer publicar un trabajo */}
                {esCliente && (
                  <Link
                    href="/cliente/trabajos/nuevo"
                    className="flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Publicar trabajo
                  </Link>
                )}

                {/* Si es cliente (no profesional), ofrecer registrarse como profesional */}
                {!esProfesional && !esAdmin && (
                  <Link
                    href="/profesional/registro"
                    className="flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    <Briefcase className="h-4 w-4" />
                    Soy profesional
                  </Link>
                )}

                {/* Si es profesional, ofrecer ver trabajos disponibles */}
                {esProfesional && (
                  <Link
                    href="/trabajos"
                    className="flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    <Briefcase className="h-4 w-4" />
                    Trabajos
                  </Link>
                )}

                {/* Si es profesional, ofrecer ver planes */}
                {esProfesional && (
                  <Link
                    href="/planes"
                    className="flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    <CreditCard className="h-4 w-4" />
                    Planes
                  </Link>
                )}

                {/* Campana de notificaciones */}
                <NotificationsBell />

                {/* Menú de usuario */}
                <div className="relative ml-2 group">
                  <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10">
                    {session?.user?.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || ""}
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <UserCircle className="h-7 w-7" />
                    )}
                    <span className="hidden lg:inline">{session?.user?.name?.split(" ")[0]}</span>
                  </button>

                  {/* Dropdown */}
                  <div className="invisible absolute right-0 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-xl transition-all group-hover:visible">
                    <div className="border-b border-border px-4 py-2">
                      <p className="text-sm font-medium text-navy truncate">{session?.user?.name}</p>
                      <p className="text-xs text-text-light truncate">{session?.user?.email}</p>
                    </div>
                    <Link
                      href="/chat"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Mis mensajes
                    </Link>
                    {esProfesional && (
                      <Link
                        href="/profesional/perfil"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface"
                      >
                        <Briefcase className="h-4 w-4" />
                        Editar perfil profesional
                      </Link>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/5"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="ml-2 inline-flex items-center rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-dark"
              >
                <User className="mr-1.5 h-4 w-4" />
                Iniciar sesión
              </Link>
            )}
          </div>

          {/* Botón menú móvil */}
          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Menú móvil */}
        {mobileMenuOpen && (
          <div className="animate-fade-in border-t border-white/10 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link
                href="/busqueda"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Search className="h-4 w-4" />
                Buscar profesionales
              </Link>

              {estaAutenticado ? (
                <>
                  {/* Link al chat (móvil) */}
                  <Link
                    href="/chat"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat
                    {noLeidos > 0 && (
                      <span className="ml-auto bg-orange text-white text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                        {noLeidos > 99 ? "99+" : noLeidos}
                      </span>
                    )}
                  </Link>

                  {esAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Panel Admin
                    </Link>
                  )}
                  {esCliente && (
                    <Link
                      href="/cliente/trabajos/nuevo"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Publicar trabajo
                    </Link>
                  )}
                  {esProfesional && (
                    <Link
                      href="/trabajos"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Briefcase className="h-4 w-4" />
                      Ver trabajos
                    </Link>
                  )}
                  {!esProfesional && !esAdmin && (
                    <Link
                      href="/profesional/registro"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Briefcase className="h-4 w-4" />
                      Soy profesional
                    </Link>
                  )}
                  <Link
                    href="/notificaciones"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bell className="h-4 w-4" />
                    Notificaciones
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-error/80 hover:bg-white/10 hover:text-error"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-dark"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
