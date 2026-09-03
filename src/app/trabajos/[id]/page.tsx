"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Calendar, Lock, CheckCircle2, User, MessageCircle, Send } from "lucide-react";

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
  whatsappContacto: string | null;
  createdAt: string;
  oficio: { nombre: string; icono: string };
  cliente: { id: string; nombre: string; email: string; imagen: string | null } | null;
}

const TIPO_LABEL: Record<TrabajoDetalle["tipoContratacion"], string> = {
  POR_HORA: "Por hora",
  PRESUPUESTO: "Presupuesto total",
  CONVENIR: "A convenir",
};

export default function DetalleTrabajoPage() {
  const params = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [trabajo, setTrabajo] = useState<TrabajoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [requiereSuscripcion, setRequiereSuscripcion] = useState(false);
  const [error, setError] = useState("");

  // Formulario de postulación
  const [mensaje, setMensaje] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [postulado, setPostulado] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login?callbackUrl=/trabajos");
      return;
    }
    if (session.user.rol !== "PROFESIONAL" && session.user.rol !== "ADMIN") {
      router.push("/cliente/trabajos");
      return;
    }

    fetch(`/api/trabajos/${params.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data.requiereSuscripcion) setRequiereSuscripcion(true);
          else setError(data.error || "Error cargando el trabajo");
          return;
        }
        setTrabajo(data.trabajo);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setCargando(false));
  }, [status, session, router, params.id]);

  const handlePostular = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch(`/api/trabajos/${params.id}/postular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje,
          presupuesto: presupuesto ? parseFloat(presupuesto) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al postularte");
      }
      setPostulado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  };

  if (status === "loading" || cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  if (requiereSuscripcion) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-orange/30 bg-orange/5 p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange/10">
            <Lock className="h-8 w-8 text-orange" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-navy">Este contenido es para suscriptores</h1>
          <p className="mt-3 text-text-light">
            Para ver el contacto del cliente y postularte a este trabajo necesitás una
            suscripción Profesional o Premium.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/planes"
              className="rounded-lg bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark"
            >
              Ver planes
            </Link>
            <Link
              href="/trabajos"
              className="rounded-lg border border-border px-6 py-3 font-semibold text-text transition-colors hover:bg-surface"
            >
              Volver
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trabajo) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-medium text-navy">{error || "No se pudo cargar el trabajo"}</p>
        <Link href="/trabajos" className="mt-4 inline-block text-sm text-orange hover:underline">
          ← Volver a trabajos
        </Link>
      </div>
    );
  }

  const presupuestoTexto =
    trabajo.presupuestoMin != null || trabajo.presupuestoMax != null
      ? `$${trabajo.presupuestoMin?.toLocaleString("es-AR") ?? ""} - $${trabajo.presupuestoMax?.toLocaleString("es-AR") ?? ""}`
      : null;

  const inputCls =
    "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/trabajos" className="text-sm text-orange hover:underline">
        ← Volver a trabajos
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Info del trabajo */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-navy">{trabajo.titulo}</h1>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-text-light">
                {trabajo.oficio.icono} {trabajo.oficio.nombre}
              </span>
              {trabajo.estado === "ABIERTO" && (
                <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                  Abierto
                </span>
              )}
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text">
              {trabajo.descripcion}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-surface p-4">
                <p className="text-xs text-text-light">Ciudad</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-medium text-navy">
                  <MapPin className="h-4 w-4" />
                  {trabajo.ciudad}{trabajo.barrio ? `, ${trabajo.barrio}` : ""}
                </p>
              </div>
              <div className="rounded-lg bg-surface p-4">
                <p className="text-xs text-text-light">Contratación</p>
                <p className="mt-0.5 font-medium text-navy">{TIPO_LABEL[trabajo.tipoContratacion]}</p>
              </div>
              {presupuestoTexto && (
                <div className="rounded-lg bg-surface p-4">
                  <p className="text-xs text-text-light">Presupuesto</p>
                  <p className="mt-0.5 font-semibold text-orange">{presupuestoTexto}</p>
                </div>
              )}
              {trabajo.fechaLimite && (
                <div className="rounded-lg bg-surface p-4">
                  <p className="text-xs text-text-light">Fecha límite</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-medium text-navy">
                    <Calendar className="h-4 w-4" />
                    {new Date(trabajo.fechaLimite).toLocaleDateString("es-AR")}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Cliente */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">Cliente</h3>
            <div className="flex items-center gap-3">
              {trabajo.cliente?.imagen ? (
                <img src={trabajo.cliente.imagen} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                  {trabajo.cliente?.nombre.charAt(0) || "?"}
                </div>
              )}
              <div>
                <p className="font-medium text-navy">{trabajo.cliente?.nombre}</p>
                <p className="text-xs text-text-light">{trabajo.cliente?.email}</p>
              </div>
            </div>
          </section>

          {/* Postulación */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">
              <MessageCircle className="mr-1 inline h-4 w-4" />
              Enviar propuesta
            </h3>

            {postulado ? (
              <div className="flex flex-col items-center rounded-lg bg-success/10 p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <p className="mt-3 font-semibold text-navy">¡Propuesta enviada!</p>
                <p className="mt-1 text-sm text-text-light">
                  El cliente va a recibir una notificación con tu postulación.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePostular} className="space-y-3">
                {error && (
                  <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
                    {error}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Mensaje para el cliente *</label>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={4}
                    placeholder="Contá tu experiencia, disponibilidad y cómo resolverías el trabajo."
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Presupuesto ($)</label>
                  <input
                    type="number"
                    value={presupuesto}
                    onChange={(e) => setPresupuesto(e.target.value)}
                    placeholder="Opcional"
                    min="0"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange px-5 py-2.5 font-semibold text-white transition-colors hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {enviando ? "Enviando..." : "Enviar propuesta"}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
