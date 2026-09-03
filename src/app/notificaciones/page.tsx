"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  enlace: string | null;
  createdAt: string;
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificacionesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    const cargar = async () => {
      try {
        const res = await fetch("/api/notificaciones?limit=50");
        if (res.ok) {
          const data = await res.json();
          setNotificaciones(data.notificaciones || []);
        }
      } catch {
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [status, router]);

  if (status === "loading" || cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-navy">
        <Bell className="h-6 w-6 text-orange" />
        Notificaciones
      </h1>

      {notificaciones.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <p className="text-text-light">No tenés notificaciones todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificaciones.map((notif) => (
            <Link
              key={notif.id}
              href={notif.enlace || "#"}
              className={`block rounded-xl border px-5 py-4 transition-colors ${
                notif.leida
                  ? "border-border bg-card"
                  : "border-orange/30 bg-orange/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={`text-sm ${notif.leida ? "text-text" : "font-semibold text-navy"}`}>
                    {notif.titulo}
                  </p>
                  <p className="mt-1 text-sm text-text-light">{notif.mensaje}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="whitespace-nowrap text-xs text-text-light">
                    {formatearFecha(notif.createdAt)}
                  </span>
                  {!notif.leida && <span className="h-2 w-2 rounded-full bg-orange" />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
