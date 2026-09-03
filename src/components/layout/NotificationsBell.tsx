"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import Link from "next/link";

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  enlace: string | null;
  createdAt: string;
}

function formatearTiempo(fecha: string): string {
  const date = new Date(fecha);
  const ahora = new Date();
  const diffMin = Math.floor((ahora.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `hace ${diffHoras} h`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 7) return `hace ${diffDias} d`;
  return date.toLocaleDateString("es-AR");
}

export function NotificationsBell() {
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cargar = async () => {
    try {
      const res = await fetch("/api/notificaciones?limit=15");
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data.notificaciones || []);
        setNoLeidas(data.noLeidas || 0);
      }
    } catch {}
  };

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const marcarLeida = async (id?: string) => {
    setCargando(true);
    try {
      await fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
      if (id) {
        setNotificaciones((prev) =>
          prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
        );
        setNoLeidas((prev) => Math.max(0, prev - 1));
      } else {
        setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
        setNoLeidas(0);
      }
    } catch {
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setAbierto(!abierto);
          if (!abierto) cargar();
        }}
        className="relative flex items-center justify-center rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-white">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-1 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-navy">Notificaciones</h3>
            {noLeidas > 0 && (
              <button
                onClick={() => marcarLeida()}
                disabled={cargando}
                className="text-xs text-orange hover:underline disabled:opacity-50"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-text-light">No tenés notificaciones</p>
              </div>
            ) : (
              notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  className={`border-b border-border/50 px-4 py-3 transition-colors ${
                    notif.leida ? "bg-card" : "bg-orange/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={notif.enlace || "#"}
                        onClick={() => {
                          if (!notif.leida) marcarLeida(notif.id);
                          setAbierto(false);
                        }}
                        className="block"
                      >
                        <p className={`text-sm ${notif.leida ? "text-text" : "font-medium text-navy"}`}>
                          {notif.titulo}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-light">
                          {notif.mensaje}
                        </p>
                      </Link>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-text-light whitespace-nowrap">
                        {formatearTiempo(notif.createdAt)}
                      </span>
                      {!notif.leida && (
                        <span className="h-2 w-2 rounded-full bg-orange" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
