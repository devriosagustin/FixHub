"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, MapPin, Users } from "lucide-react";

interface MiTrabajo {
  id: string;
  titulo: string;
  descripcion: string;
  ciudad: string | null;
  barrio: string | null;
  estado: "ABIERTO" | "EN_PROCESO" | "CERRADO";
  createdAt: string;
  _count: { postulaciones: number };
  oficio: { nombre: string; icono: string };
}

const ESTADO_LABEL: Record<MiTrabajo["estado"], string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  CERRADO: "Cerrado",
};

const ESTADO_CLASS: Record<MiTrabajo["estado"], string> = {
  ABIERTO: "bg-success/10 text-success",
  EN_PROCESO: "bg-orange/10 text-orange",
  CERRADO: "bg-border text-text-light",
};

export default function MisTrabajosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [trabajos, setTrabajos] = useState<MiTrabajo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login?callbackUrl=/cliente/trabajos");
      return;
    }
    if (session.user.rol === "PROFESIONAL") {
      router.push("/trabajos");
      return;
    }

    fetch("/api/trabajos/mios")
      .then((res) => res.json())
      .then((data) => setTrabajos(data.trabajos || []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [status, session, router]);

  const formatearFecha = useCallback((iso: string) => {
    return new Date(iso).toLocaleDateString("es-AR");
  }, []);

  if (status === "loading" || cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Mis trabajos</h1>
          <p className="mt-1 text-text-light">
            Publicá un trabajo y recibí propuestas de profesionales.
          </p>
        </div>
        <Link
          href="/cliente/trabajos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 font-semibold text-white transition-colors hover:bg-orange-dark"
        >
          <Plus className="h-4 w-4" />
          Publicar trabajo
        </Link>
      </div>

      {trabajos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-lg font-medium text-navy">Todavía no publicaste ningún trabajo</p>
          <p className="mt-2 text-text-light">
            Cuando publiques, vas a poder recibir propuestas de profesionales.
          </p>
          <Link
            href="/cliente/trabajos/nuevo"
            className="mt-4 inline-block text-sm font-semibold text-orange hover:underline"
          >
            Publicar mi primer trabajo →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {trabajos.map((t) => (
            <Link
              key={t.id}
              href={`/cliente/trabajos/${t.id}`}
              className="block rounded-xl border border-border bg-card p-5 transition-all hover:border-orange/30 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-navy">{t.titulo}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_CLASS[t.estado]}`}>
                  {ESTADO_LABEL[t.estado]}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-text-light">{t.descripcion}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-light">
                <span>{t.oficio.icono} {t.oficio.nombre}</span>
                {t.ciudad && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {t.ciudad}{t.barrio ? `, ${t.barrio}` : ""}
                  </span>
                )}
                <span>Publicado el {formatearFecha(t.createdAt)}</span>
                <span className="flex items-center gap-1 font-medium text-navy">
                  <Users className="h-3.5 w-3.5" />
                  {t._count.postulaciones} postulación(es)
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
