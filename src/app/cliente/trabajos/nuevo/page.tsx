"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Oficio {
  id: string;
  nombre: string;
  icono: string;
}

export default function PublicarTrabajoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [oficioId, setOficioId] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [barrio, setBarrio] = useState("");
  const [tipoContratacion, setTipoContratacion] = useState("CONVENIR");
  const [presupuestoMin, setPresupuestoMin] = useState("");
  const [presupuestoMax, setPresupuestoMax] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [whatsappContacto, setWhatsappContacto] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const MAX_FOTOS = 5;

  useEffect(() => {
    fetch("/api/oficios")
      .then((res) => res.json())
      .then((data) => setOficios(data))
      .catch(() => setError("Error cargando oficios"));
  }, []);

  const handleFotosSeleccionadas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    if (fotos.length + files.length > MAX_FOTOS) {
      setError(`Podés subir hasta ${MAX_FOTOS} fotos por trabajo`);
      return;
    }

    setError("");
    setSubiendoFotos(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/trabajos/fotos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al subir las fotos");
      }

      setFotos((prev) => [...prev, ...data.fotos]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubiendoFotos(false);
    }
  };

  const handleQuitarFoto = (url: string) => {
    setFotos((prev) => prev.filter((f) => f !== url));
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    router.push("/login?callbackUrl=/cliente/trabajos/nuevo");
    return null;
  }

  if (session.user.rol === "PROFESIONAL") {
    router.push("/trabajos");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        titulo,
        descripcion,
        oficioId,
        ciudad,
        barrio: barrio || undefined,
        tipoContratacion,
        presupuestoMin: presupuestoMin ? parseFloat(presupuestoMin) : undefined,
        presupuestoMax: presupuestoMax ? parseFloat(presupuestoMax) : undefined,
        fechaLimite: fechaLimite ? new Date(fechaLimite).toISOString() : null,
        whatsappContacto: whatsappContacto || undefined,
        fotos: fotos.length ? fotos : undefined,
      };

      const res = await fetch("/api/trabajos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al publicar el trabajo");
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
          <h1 className="mt-4 text-2xl font-bold text-navy">¡Trabajo publicado!</h1>
          <p className="mt-3 text-text-light">
            Tu trabajo quedó publicado y ahora los profesionales suscritos pueden verlo
            y postularse. Vas a recibir notificaciones cuando alguien se postule.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.push("/cliente/trabajos")}
              className="rounded-lg bg-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-light"
            >
              Ver mis trabajos
            </button>
            <button
              onClick={() => {
                setExito(false);
                setTitulo("");
                setDescripcion("");
                setOficioId("");
                setCiudad("");
                setBarrio("");
                setPresupuestoMin("");
                setPresupuestoMax("");
                setFechaLimite("");
                setWhatsappContacto("");
                setFotos([]);
              }}
              className="rounded-lg border border-orange px-6 py-3 font-semibold text-orange transition-colors hover:bg-orange/5"
            >
              Publicar otro
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <Link href="/cliente/trabajos" className="text-sm text-orange hover:underline">
          ← Volver a mis trabajos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-navy">Publicar un trabajo</h1>
        <p className="mt-1 text-text-light">
          Describí lo que necesitás y los profesionales se van a postular con sus propuestas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy">Detalles del trabajo</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Título del trabajo *</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Necesito arreglar una pérdida de agua"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">Descripción *</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={5}
                placeholder="Contanos qué necesitás, características del trabajo, urgencia, etc."
                required
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Oficio *</label>
                <select
                  value={oficioId}
                  onChange={(e) => setOficioId(e.target.value)}
                  required
                  className={inputCls}
                >
                  <option value="">Seleccioná un oficio</option>
                  {oficios.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.icono} {o.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Ciudad *</label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Ej: Córdoba"
                  required
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Barrio</label>
                <input
                  type="text"
                  value={barrio}
                  onChange={(e) => setBarrio(e.target.value)}
                  placeholder="Opcional"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Fecha límite</label>
                <input
                  type="date"
                  value={fechaLimite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy">Fotos (opcional)</h2>
          <p className="mb-4 text-sm text-text-light">
            Subí hasta {MAX_FOTOS} fotos para que los profesionales entiendan mejor el trabajo.
          </p>
          <div className="flex flex-wrap gap-3">
            {fotos.map((url) => (
              <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleQuitarFoto(url)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-navy/80 text-xs font-bold text-white transition-opacity hover:bg-error"
                  aria-label="Quitar foto"
                >
                  ×
                </button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <label
                className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-text-light transition-colors hover:border-orange hover:text-orange ${
                  subiendoFotos ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleFotosSeleccionadas}
                  disabled={subiendoFotos}
                  className="hidden"
                />
                <span className="text-2xl leading-none">+</span>
                {subiendoFotos ? "Subiendo..." : "Agregar"}
              </label>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy">Presupuesto y contacto</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Forma de contratación</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: "CONVENIR", label: "A convenir" },
                  { id: "PRESUPUESTO", label: "Presupuesto total" },
                  { id: "POR_HORA", label: "Por hora" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipoContratacion(t.id)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                      tipoContratacion === t.id
                        ? "border-orange bg-orange/5 text-orange"
                        : "border-border bg-white text-text hover:border-navy/30"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Presupuesto mínimo ($)</label>
                <input
                  type="number"
                  value={presupuestoMin}
                  onChange={(e) => setPresupuestoMin(e.target.value)}
                  placeholder="Opcional"
                  min="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Presupuesto máximo ($)</label>
                <input
                  type="number"
                  value={presupuestoMax}
                  onChange={(e) => setPresupuestoMax(e.target.value)}
                  placeholder="Opcional"
                  min="0"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                WhatsApp de contacto (con código de área)
              </label>
              <input
                type="tel"
                value={whatsappContacto}
                onChange={(e) => setWhatsappContacto(e.target.value)}
                placeholder="Ej: 11 5555 1234"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-text-light">
                Los profesionales podrán contactarte por WhatsApp. Si no lo completás,
                se contactarán por chat interno.
              </p>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-orange px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargando ? "Publicando..." : "Publicar trabajo"}
        </button>
      </form>
    </div>
  );
}
