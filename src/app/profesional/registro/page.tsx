"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Oficio {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
}

export default function RegistroProfesionalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  // Formulario
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [anosExperiencia, setAnosExperiencia] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [barrio, setBarrio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tipoPrecio, setTipoPrecio] = useState("convenir");
  const [precioPorHora, setPrecioPorHora] = useState("");
  const [oficiosSeleccionados, setOficiosSeleccionados] = useState<string[]>([]);

  // Cargar oficios disponibles
  useEffect(() => {
    fetch("/api/oficios")
      .then((res) => res.json())
      .then((data) => setOficios(data))
      .catch(() => setError("Error cargando oficios"));
  }, []);

  // Redirigir si no está logueado
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    router.push("/login?callbackUrl=/profesional/registro");
    return null;
  }

  const toggleOficio = (slug: string) => {
    setOficiosSeleccionados((prev) =>
      prev.includes(slug) ? prev.filter((o) => o !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/profesionales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          descripcion,
          anosExperiencia: anosExperiencia ? parseInt(anosExperiencia) : undefined,
          ciudad,
          barrio,
          direccion,
          telefono,
          whatsapp: whatsapp || undefined,
          tipoPrecio,
          precioPorHora: precioPorHora ? parseFloat(precioPorHora) : undefined,
          oficios: oficiosSeleccionados,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al registrar");
      }

      setExito(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  };

  if (exito) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-success/20 bg-success/5 p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-3xl">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-navy">¡Perfil creado!</h1>
          <p className="mt-3 text-text-light">
            Tu perfil profesional fue registrado exitosamente. Nuestro equipo verificará
            tu documentación y te notificaremos por email cuando tu perfil sea aprobado.
          </p>
          <p className="mt-2 text-sm text-text-light">
            Mientras tanto, podés completar tu perfil con fotos de trabajos, certificaciones
            y más datos.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-lg bg-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-light"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Registrar perfil profesional</h1>
        <p className="mt-2 text-text-light">
          Completá los datos de tu perfil para que los clientes puedan encontrarte.
          Tu perfil será revisado por un administrador antes de ser publicado.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-error/20 bg-error/5 p-4 text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* =============================================
            DATOS BÁSICOS
            ============================================= */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy">Datos básicos</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                Título / Especialidad *
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Electricista Matriculado"
                required
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                Descripción de tus servicios *
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describí detalladamente qué servicios ofrecés, tu experiencia, y por qué debería contratarte..."
                required
                rows={5}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
              />
              <p className="mt-1 text-xs text-text-light">Mínimo 20 caracteres</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                Años de experiencia
              </label>
              <input
                type="number"
                value={anosExperiencia}
                onChange={(e) => setAnosExperiencia(e.target.value)}
                placeholder="Ej: 10"
                min="0"
                max="60"
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
              />
            </div>
          </div>
        </section>

        {/* =============================================
            OFICIOS
            ============================================= */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold text-navy">Oficios *</h2>
          <p className="mb-4 text-sm text-text-light">
            Seleccioná todos los oficios que ejercés.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {oficios.map((oficio) => (
              <button
                key={oficio.slug}
                type="button"
                onClick={() => toggleOficio(oficio.slug)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                  oficiosSeleccionados.includes(oficio.slug)
                    ? "border-orange bg-orange/5 font-medium text-orange"
                    : "border-border bg-white text-text hover:border-navy/30"
                }`}
              >
                <span>{oficio.icono}</span>
                <span>{oficio.nombre}</span>
              </button>
            ))}
          </div>

          {oficiosSeleccionados.length === 0 && (
            <p className="mt-2 text-xs text-error">Seleccioná al menos un oficio</p>
          )}
        </section>

        {/* =============================================
            UBICACIÓN
            ============================================= */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy">Ubicación</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Ciudad *</label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej: Buenos Aires"
                required
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Barrio</label>
                <input
                  type="text"
                  value={barrio}
                  onChange={(e) => setBarrio(e.target.value)}
                  placeholder="Ej: Palermo"
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Dirección del local</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* =============================================
            CONTACTO Y PRECIOS
            ============================================= */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy">Contacto y precios</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                Teléfono de contacto *
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 11 5555 1234"
                required
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                WhatsApp (con código de área)
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej: 11 5555 1234"
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
              />
              <p className="mt-1 text-xs text-text-light">
                Los clientes podrán contactarte por WhatsApp con este número.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                Tipo de precio
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTipoPrecio("convenir")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    tipoPrecio === "convenir"
                      ? "border-orange bg-orange/5 text-orange"
                      : "border-border bg-white text-text hover:border-navy/30"
                  }`}
                >
                  Presupuesto a convenir
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPrecio("por_hora")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    tipoPrecio === "por_hora"
                      ? "border-orange bg-orange/5 text-orange"
                      : "border-border bg-white text-text hover:border-navy/30"
                  }`}
                >
                  Precio por hora
                </button>
              </div>
            </div>

            {tipoPrecio === "por_hora" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-text">
                  Precio por hora (ARS)
                </label>
                <input
                  type="number"
                  value={precioPorHora}
                  onChange={(e) => setPrecioPorHora(e.target.value)}
                  placeholder="Ej: 5000"
                  min="0"
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
                />
              </div>
            )}
          </div>
        </section>

        {/* =============================================
            SUBMIT
            ============================================= */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-text-light">
            Tu perfil será revisado antes de ser publicado.
          </p>
          <button
            type="submit"
            disabled={cargando || oficiosSeleccionados.length === 0}
            className="rounded-lg bg-orange px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? "Registrando..." : "Registrar perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}
