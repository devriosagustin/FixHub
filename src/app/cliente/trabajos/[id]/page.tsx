"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Calendar, Briefcase, MessageCircle, Star } from "lucide-react";

interface Postulacion {
  id: string;
  mensaje: string;
  presupuesto: number | null;
  estado: string;
  perfil: {
    id: string;
    titulo: string;
    usuario: { nombre: string };
  };
}

interface TrabajoDetalle {
  id: string;
  titulo: string;
  descripcion: string;
  ciudad: string | null;
  barrio: string | null;
  tipoContratacion: "POR_HORA" | "PRESUPUESTO" | "CONVENIR";
  presupuestoMin: number | null;
  presupuestoMax: number | null;
  fechaLimite: string | null;
  estado: "ABIERTO" | "EN_PROCESO" | "CERRADO";
  fotos: string[];
  createdAt: string;
  oficio: { nombre: string; icono: string };
  postulaciones: Postulacion[];
}

const TIPO_LABEL: Record<TrabajoDetalle["tipoContratacion"], string> = {
  POR_HORA: "Por hora",
  PRESUPUESTO: "Presupuesto total",
  CONVENIR: "A convenir",
};

export default function DetalleTrabajoClientePage() {
  const params = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [trabajo, setTrabajo] = useState<TrabajoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [contactandoId, setContactandoId] = useState<string | null>(null);

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

    fetch(`/api/trabajos/${params.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error cargando el trabajo");
          return;
        }
        setTrabajo(data.trabajo);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setCargando(false));
  }, [status, session, router, params.id]);

  const handleContactar = async (perfilProfesionalId: string) => {
    if (!session) return;
    setContactandoId(perfilProfesionalId);
    try {
      const res = await fetch("/api/chat/conversaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilProfesionalId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al abrir el chat");
        return;
      }
      router.push(`/chat?conversacion=${data.conversacion.id}`);
    } catch {
      alert("Error al abrir el chat");
    } finally {
      setContactandoId(null);
    }
  };

  if (status === "loading" || cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  if (error || !trabajo) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-medium text-navy">{error || "No se pudo cargar el trabajo"}</p>
        <Link href="/cliente/trabajos" className="mt-4 inline-block text-sm text-orange hover:underline">
          ← Volver a mis trabajos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/cliente/trabajos" className="text-sm text-orange hover:underline">
        ← Volver a mis trabajos
      </Link>

      <section className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-navy">{trabajo.titulo}</h1>
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
            {trabajo.estado === "ABIERTO" ? "Abierto" : "Cerrado"}
          </span>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text">{trabajo.descripcion}</p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-light">
          <span>{trabajo.oficio.icono} {trabajo.oficio.nombre}</span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {trabajo.ciudad}{trabajo.barrio ? `, ${trabajo.barrio}` : ""}
          </span>
          <span>{TIPO_LABEL[trabajo.tipoContratacion]}</span>
          {trabajo.fechaLimite && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(trabajo.fechaLimite).toLocaleDateString("es-AR")}
            </span>
          )}
        </div>

        {trabajo.fotos.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-light">Fotos</p>
            <div className="flex flex-wrap gap-3">
              {trabajo.fotos.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-24 w-24 overflow-hidden rounded-lg border border-border"
                >
                  <img src={url} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Postulaciones */}
      <section className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-navy">
          <Briefcase className="h-5 w-5 text-orange" />
          Postulaciones ({trabajo.postulaciones.length})
        </h2>

        {trabajo.postulaciones.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center">
            <p className="text-lg font-medium text-navy">Todavía no recibiste postulaciones</p>
            <p className="mt-2 text-text-light">
              Cuando un profesional se postule, vas a poder verlo acá.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trabajo.postulaciones.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                    {p.perfil.usuario.nombre.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy">{p.perfil.usuario.nombre}</p>
                    <p className="text-xs text-text-light">{p.perfil.titulo}</p>
                  </div>
                  {p.presupuesto != null && (
                    <span className="rounded-lg bg-orange/10 px-3 py-1 text-sm font-semibold text-orange">
                      ${p.presupuesto.toLocaleString("es-AR")}
                    </span>
                  )}
                  <button
                    onClick={() => handleContactar(p.perfil.id)}
                    disabled={contactandoId === p.perfil.id}
                    className="flex items-center gap-1.5 rounded-lg border border-navy px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-50"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {contactandoId === p.perfil.id ? "Abriendo..." : "Conversar"}
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-text">{p.mensaje}</p>

                <Link
                  href={`/perfil/${p.perfil.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-orange hover:underline"
                >
                  <Star className="h-3.5 w-3.5" />
                  Ver perfil del profesional
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
