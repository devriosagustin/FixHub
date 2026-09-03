"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Upload, X, Star, Clock, FileText, Camera, CreditCard } from "lucide-react";
import { SuspensionTab } from "@/components/subscriptions/SuspensionTab";

interface PerfilData {
  id: string;
  titulo: string;
  descripcion: string;
  anosExperiencia: number | null;
  ciudad: string;
  barrio: string;
  direccion: string;
  telefono: string;
  whatsapp: string;
  sitioWeb: string;
  instagram: string;
  facebook: string;
  tipoPrecio: string;
  precioPorHora: number | null;
  videoUrl: string;
  estado: string;
  oficios: { oficio: { slug: string; nombre: string; icono: string } }[];
  galeriaFotos: { id: string; url: string }[];
  certificaciones: { id: string; nombre: string; url: string; tipo: string }[];
  horarios: { id: string; diaSemana: number; horaInicio: string; horaFin: string; activo: boolean }[];
  documentos: { tipo: string; estado: string }[];
  suscripcion: { plan: string } | null;
}

interface Oficio {
  slug: string;
  nombre: string;
  icono: string;
}

const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function EditarPerfilProfesionalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [oficiosDisponibles, setOficiosDisponibles] = useState<Oficio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tab, setTab] = useState<"datos" | "galeria" | "certificaciones" | "horarios" | "dni" | "suscripcion">("datos");

  // Formulario datos básicos
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [anosExperiencia, setAnosExperiencia] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [barrio, setBarrio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tipoPrecio, setTipoPrecio] = useState("convenir");
  const [precioPorHora, setPrecioPorHora] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [oficiosSeleccionados, setOficiosSeleccionados] = useState<string[]>([]);

  // Horarios
  const [horarios, setHorarios] = useState(
    Array.from({ length: 7 }, (_, i) => ({
      diaSemana: i,
      horaInicio: "09:00",
      horaFin: "18:00",
      activo: i >= 1 && i <= 5, // Lunes a Viernes activos por defecto
    }))
  );

  const cargarDatos = useCallback(async () => {
    try {
      const [perfilRes, oficiosRes] = await Promise.all([
        fetch("/api/profesionales/mi-perfil"),
        fetch("/api/oficios"),
      ]);

      const oficiosData = await oficiosRes.json();
      setOficiosDisponibles(oficiosData);

      if (!perfilRes.ok) {
        if (perfilRes.status === 404) {
          router.push("/profesional/registro");
          return;
        }
        setCargando(false);
        return;
      }

      const miPerfil = await perfilRes.json();
      cargarPerfil(miPerfil);
    } catch {
      setCargando(false);
    }
  }, [router]);

  const cargarPerfil = (p: PerfilData) => {
    setPerfil(p);
    setTitulo(p.titulo || "");
    setDescripcion(p.descripcion || "");
    setAnosExperiencia(p.anosExperiencia?.toString() || "");
    setCiudad(p.ciudad || "");
    setBarrio(p.barrio || "");
    setDireccion(p.direccion || "");
    setTelefono(p.telefono || "");
    setWhatsapp(p.whatsapp || "");
    setSitioWeb(p.sitioWeb || "");
    setInstagram(p.instagram || "");
    setFacebook(p.facebook || "");
    setTipoPrecio(p.tipoPrecio || "convenir");
    setPrecioPorHora(p.precioPorHora?.toString() || "");
    setVideoUrl(p.videoUrl || "");
    setOficiosSeleccionados(p.oficios?.map((o) => o.oficio.slug) || []);

    if (p.horarios?.length) {
      const horariosMapeados = Array.from({ length: 7 }, (_, i) => {
        const existente = p.horarios.find((h) => h.diaSemana === i);
        return existente
          ? { diaSemana: i, horaInicio: existente.horaInicio, horaFin: existente.horaFin, activo: existente.activo }
          : { diaSemana: i, horaInicio: "09:00", horaFin: "18:00", activo: false };
      });
      setHorarios(horariosMapeados);
    }
    setCargando(false);
  };

  useEffect(() => {
    if (status === "authenticated") {
      cargarDatos();
    }
  }, [status, cargarDatos]);

  if (status === "loading" || cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  if (!perfil) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-text-light">No se encontró tu perfil profesional.</p>
        <button
          onClick={() => router.push("/profesional/registro")}
          className="mt-4 rounded-lg bg-orange px-6 py-2 text-white hover:bg-orange-dark"
        >
          Crear perfil
        </button>
      </div>
    );
  }

  const guardarDatos = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      const res = await fetch(`/api/profesionales/${perfil.id}`, {
        method: "PUT",
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
          sitioWeb,
          instagram,
          facebook,
          tipoPrecio,
          precioPorHora: precioPorHora ? parseFloat(precioPorHora) : undefined,
          videoUrl,
          oficios: oficiosSeleccionados,
        }),
      });
      if (res.ok) {
        setMensaje("Perfil guardado correctamente");
      } else {
        setMensaje("Error al guardar");
      }
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  const guardarHorarios = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      const res = await fetch(`/api/profesionales/${perfil.id}/horarios`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horarios }),
      });
      if (res.ok) {
        setMensaje("Horarios guardados correctamente");
      } else {
        setMensaje("Error al guardar horarios");
      }
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  const subirGaleria = async (files: FileList | null) => {
    if (!files) return;
    setGuardando(true);
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }
    try {
      const res = await fetch(`/api/profesionales/${perfil.id}/galeria`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setMensaje("Fotos subidas correctamente");
        cargarDatos();
      } else {
        const data = await res.json();
        setMensaje(data.error || "Error al subir fotos");
      }
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarFoto = async (fotoId: string) => {
    if (!confirm("¿Eliminar esta foto?")) return;
    try {
      await fetch(`/api/profesionales/${perfil.id}/galeria?fotoId=${fotoId}`, { method: "DELETE" });
      cargarDatos();
    } catch {}
  };

  const subirCertificacion = async (file: File | null, nombre: string) => {
    if (!file || !nombre) return;
    setGuardando(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("nombre", nombre);
    try {
      const res = await fetch(`/api/profesionales/${perfil.id}/certificaciones`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setMensaje("Certificación subida");
        cargarDatos();
      } else {
        const data = await res.json();
        setMensaje(data.error || "Error");
      }
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCertificacion = async (certId: string) => {
    if (!confirm("¿Eliminar esta certificación?")) return;
    try {
      await fetch(`/api/profesionales/${perfil.id}/certificaciones?certId=${certId}`, { method: "DELETE" });
      cargarDatos();
    } catch {}
  };

  const subirDNI = async (frente: File | null, dorso: File | null) => {
    if (!frente || !dorso) {
      setMensaje("Se necesitan ambas fotos del DNI");
      return;
    }
    setGuardando(true);
    const formData = new FormData();
    formData.append("frente", frente);
    formData.append("dorso", dorso);
    try {
      const res = await fetch(`/api/profesionales/${perfil.id}/documentos`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setMensaje("DNI subido correctamente. Pendiente de revisión.");
        cargarDatos();
      } else {
        const data = await res.json();
        setMensaje(data.error || "Error");
      }
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  const toggleOficio = (slug: string) => {
    setOficiosSeleccionados((prev) =>
      prev.includes(slug) ? prev.filter((o) => o !== slug) : [...prev, slug]
    );
  };

  const tabs = [
    { id: "datos" as const, label: "Datos básicos", icon: FileText },
    { id: "galeria" as const, label: "Galería", icon: Camera },
    { id: "certificaciones" as const, label: "Certificaciones", icon: Star },
    { id: "horarios" as const, label: "Horarios", icon: Clock },
    { id: "dni" as const, label: "DNI", icon: Upload },
    { id: "suscripcion" as const, label: "Suscripción", icon: CreditCard },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Editar mi perfil</h1>
          <p className="text-sm text-text-light">Estado: {perfil.estado}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profesional/estadisticas"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface"
          >
            Estadísticas
          </Link>
          <a
            href={`/perfil/${perfil.id}`}
            target="_blank"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface"
          >
            Ver perfil público
          </a>
        </div>
      </div>

      {mensaje && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${mensaje.includes("Error") ? "bg-error/10 text-error" : "bg-success/10 text-success"}`}>
          {mensaje}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? "bg-navy text-white" : "text-text-light hover:bg-surface"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* =============================================
          TAB: DATOS BÁSICOS
          ============================================= */}
      {tab === "datos" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy">Información principal</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Título / Especialidad</label>
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Descripción</label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Años de experiencia</label>
                  <input type="number" value={anosExperiencia} onChange={(e) => setAnosExperiencia(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Teléfono</label>
                  <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">WhatsApp</label>
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ej: 11 5555 1234" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy">Oficios</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {oficiosDisponibles.map((o) => (
                <button
                  key={o.slug}
                  type="button"
                  onClick={() => toggleOficio(o.slug)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                    oficiosSeleccionados.includes(o.slug) ? "border-orange bg-orange/5 font-medium text-orange" : "border-border bg-white text-text hover:border-navy/30"
                  }`}
                >
                  <span>{o.icono}</span><span>{o.nombre}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy">Ubicación</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Ciudad</label>
                <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Barrio</label>
                <input type="text" value={barrio} onChange={(e) => setBarrio(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Dirección</label>
                <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy">Redes y web</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Sitio web</label>
                <input type="url" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Instagram</label>
                <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Facebook</label>
                <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="URL o usuario" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy">Precios</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Tipo de precio</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setTipoPrecio("convenir")} className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${tipoPrecio === "convenir" ? "border-orange bg-orange/5 text-orange" : "border-border bg-white text-text"}`}>
                    A convenir
                  </button>
                  <button type="button" onClick={() => setTipoPrecio("por_hora")} className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${tipoPrecio === "por_hora" ? "border-orange bg-orange/5 text-orange" : "border-border bg-white text-text"}`}>
                    Por hora
                  </button>
                </div>
              </div>
              {tipoPrecio === "por_hora" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Precio/hora (ARS)</label>
                  <input type="number" value={precioPorHora} onChange={(e) => setPrecioPorHora(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy">Video de presentación</h2>
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Link de YouTube o Vimeo" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
          </section>

          <div className="flex justify-end">
            <button onClick={guardarDatos} disabled={guardando} className="rounded-lg bg-orange px-8 py-3 font-semibold text-white hover:bg-orange-dark disabled:opacity-50">
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* =============================================
          TAB: GALERÍA
          ============================================= */}
      {tab === "galeria" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy">
                Galería de trabajos ({perfil.galeriaFotos.length}/20)
              </h2>
              <label className="cursor-pointer rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-dark">
                <Upload className="mr-1 inline h-4 w-4" />
                Subir fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => subirGaleria(e.target.files)}
                />
              </label>
            </div>

            {perfil.galeriaFotos.length === 0 ? (
              <p className="py-8 text-center text-text-light">No tenés fotos en tu galería. Subí fotos de tus trabajos para atraer más clientes.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {perfil.galeriaFotos.map((foto) => (
                  <div key={foto.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={foto.url} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => eliminarFoto(foto.id)}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-error text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =============================================
          TAB: CERTIFICACIONES
          ============================================= */}
      {tab === "certificaciones" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy">Certificaciones y títulos</h2>

            {perfil.certificaciones.length > 0 && (
              <div className="mb-6 space-y-2">
                {perfil.certificaciones.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-text-light" />
                      <div>
                        <p className="text-sm font-medium text-text">{cert.nombre}</p>
                        <p className="text-xs text-text-light">{cert.tipo === "pdf" ? "PDF" : "Imagen"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange hover:underline">Ver</a>
                      <button onClick={() => eliminarCertificacion(cert.id)} className="text-xs text-error hover:underline">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <UploadCertificacion onUpload={subirCertificacion} guardando={guardando} />
          </section>
        </div>
      )}

      {/* =============================================
          TAB: HORARIOS
          ============================================= */}
      {tab === "horarios" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy">Horarios de atención</h2>
            <div className="space-y-3">
              {horarios.map((h, idx) => (
                <div key={h.diaSemana} className="flex items-center gap-4 rounded-lg border border-border p-3">
                  <label className="flex items-center gap-2 min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={h.activo}
                      onChange={(e) => {
                        const nuevos = [...horarios];
                        nuevos[idx].activo = e.target.checked;
                        setHorarios(nuevos);
                      }}
                      className="h-4 w-4 rounded border-border text-orange focus:ring-orange"
                    />
                    <span className={`text-sm font-medium ${h.activo ? "text-navy" : "text-text-light"}`}>{diasSemana[h.diaSemana]}</span>
                  </label>
                  {h.activo && (
                    <>
                      <input
                        type="time"
                        value={h.horaInicio}
                        onChange={(e) => { const nuevos = [...horarios]; nuevos[idx].horaInicio = e.target.value; setHorarios(nuevos); }}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text outline-none focus:border-orange"
                      />
                      <span className="text-text-light">a</span>
                      <input
                        type="time"
                        value={h.horaFin}
                        onChange={(e) => { const nuevos = [...horarios]; nuevos[idx].horaFin = e.target.value; setHorarios(nuevos); }}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text outline-none focus:border-orange"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={guardarHorarios} disabled={guardando} className="rounded-lg bg-orange px-8 py-3 font-semibold text-white hover:bg-orange-dark disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar horarios"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =============================================
          TAB: DNI
          ============================================= */}
      {tab === "dni" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-2 text-lg font-semibold text-navy">Documentación DNI</h2>
            <p className="mb-4 text-sm text-text-light">Subí una foto del frente y dorso de tu DNI para verificación. La información es confidencial y solo la ve el equipo de fixhub.</p>

            {perfil.documentos.length > 0 && (
              <div className="mb-4 rounded-lg bg-success/5 border border-success/20 p-3">
                <p className="text-sm font-medium text-success">
                  Documentos enviados: {perfil.documentos.map((d) => `${d.tipo === "dni_frente" ? "Frente" : "Dorso"} (${d.estado})`).join(", ")}
                </p>
              </div>
            )}

            <UploadDNI onUpload={subirDNI} guardando={guardando} />
          </section>
        </div>
      )}

      {/* =============================================
          TAB: SUSCRIPCIÓN
          ============================================= */}
      {tab === "suscripcion" && (
        <div className="space-y-6">
          <SuspensionTab perfil={perfil} />
        </div>
      )}
    </div>
  );
}

// Componente para subir certificación
function UploadCertificacion({ onUpload, guardando }: { onUpload: (file: File | null, nombre: string) => Promise<void>; guardando: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");

  const handleSubmit = () => {
    if (file && nombre) {
      onUpload(file, nombre);
      setFile(null);
      setNombre("");
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <div className="space-y-3">
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del certificado (ej: Matrícula Profesional)" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text outline-none focus:border-orange" />
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-text-light" />
        <button onClick={handleSubmit} disabled={!file || !nombre || guardando} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50">
          Subir certificación
        </button>
      </div>
    </div>
  );
}

// Componente para subir DNI
function UploadDNI({ onUpload, guardando }: { onUpload: (frente: File | null, dorso: File | null) => Promise<void>; guardando: boolean }) {
  const [frente, setFrente] = useState<File | null>(null);
  const [dorso, setDorso] = useState<File | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <Upload className="mx-auto h-8 w-8 text-text-light" />
          <p className="mt-2 text-sm font-medium text-text">DNI - Frente</p>
          <input type="file" accept="image/*" onChange={(e) => setFrente(e.target.files?.[0] || null)} className="mt-2 w-full text-xs text-text-light" />
          {frente && <p className="mt-1 text-xs text-success">✓ Seleccionado</p>}
        </div>
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <Upload className="mx-auto h-8 w-8 text-text-light" />
          <p className="mt-2 text-sm font-medium text-text">DNI - Dorso</p>
          <input type="file" accept="image/*" onChange={(e) => setDorso(e.target.files?.[0] || null)} className="mt-2 w-full text-xs text-text-light" />
          {dorso && <p className="mt-1 text-xs text-success">✓ Seleccionado</p>}
        </div>
      </div>
      <button
        onClick={() => onUpload(frente, dorso)}
        disabled={!frente || !dorso || guardando}
        className="rounded-lg bg-orange px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-dark disabled:opacity-50"
      >
        {guardando ? "Subiendo..." : "Subir DNI"}
      </button>
    </div>
  );
}
