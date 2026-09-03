"use client";

import { Star, MapPin, Clock, Globe, Play, Award, Camera, ExternalLink, MessageCircle, PenSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { urlWhatsApp, normalizarWhatsApp } from "@/lib/whatsapp";

const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface PerfilCompleto {
  id: string;
  titulo: string;
  descripcion: string;
  anosExperiencia: number | null;
  ciudad: string;
  barrio: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  telefono: string;
  whatsapp: string;
  sitioWeb: string;
  instagram: string;
  facebook: string;
  tipoPrecio: string;
  precioPorHora: number | null;
  videoUrl: string;
  verificado: boolean;
  destacado: boolean;
  usuario: { id: string; nombre: string; imagen: string | null };
  oficios: { oficio: { nombre: string; icono: string } }[];
  galeriaFotos: { id: string; url: string; descripcion: string | null }[];
  certificaciones: { id: string; nombre: string; tipo: string }[];
  horarios: { diaSemana: number; horaInicio: string; horaFin: string; activo: boolean }[];
  resenas: {
    id: string;
    puntuacion: number;
    comentario: string;
    fotoUrl: string | null;
    createdAt: string;
    cliente: { id: string; nombre: string; imagen: string | null };
  }[];
  suscripcion: { plan: string } | null;
}

function Estrellas({ cantidad, size = "sm" }: { cantidad: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${cls} ${i <= cantidad ? "fill-orange text-orange" : "text-border"}`} />
      ))}
    </div>
  );
}

function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ProfesionalProfileClient({
  perfil,
  promedioEstrellas,
  totalResenas,
}: {
  perfil: PerfilCompleto;
  promedioEstrellas: number;
  totalResenas: number;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [cargandoChat, setCargandoChat] = useState(false);
  const [mostrarFormResena, setMostrarFormResena] = useState(false);
  const esPropietario = session?.user?.id === perfil.usuario?.id;

  const whatsappLink = urlWhatsApp(perfil.whatsapp, "Hola, vi tu perfil en fixhub y quería contactarte");
  const whatsappMostrar = normalizarWhatsApp(perfil.whatsapp);

  // Verificar si el usuario actual ya dejó una reseña
  const yaReseno = session?.user?.id
    ? perfil.resenas.some((r) => r.cliente.id === session.user.id)
    : false;

  // Solo clientes autenticados que no son el profesional pueden dejar reseñas
  const puedeResenar =
    session?.user?.rol === "CLIENTE" && !esPropietario && !yaReseno;

  const hoy = new Date().getDay();

  /**
   * Crear o abrir conversación con el profesional
   * Llama a la API para crear la conversación y redirige al chat
   */
  const handleContactar = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    setCargandoChat(true);
    try {
      const res = await fetch("/api/chat/conversaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilProfesionalId: perfil.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Error al crear la conversación");
        return;
      }

      const data = await res.json();
      // Redirigir al chat con la conversación activa
      router.push(`/chat?conversacion=${data.conversacion.id}`);
    } catch (err) {
      console.error("Error al contactar:", err);
      alert("Error al contactar al profesional");
    } finally {
      setCargandoChat(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Avatar */}
          <div className="shrink-0">
            {perfil.usuario.imagen ? (
              <img
                src={perfil.usuario.imagen}
                alt={perfil.usuario.nombre}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-surface sm:h-32 sm:w-32"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-navy text-3xl font-bold text-white ring-4 ring-surface sm:h-32 sm:w-32">
                {perfil.usuario.nombre.charAt(0)}
              </div>
            )}
          </div>

          {/* Info principal */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-navy sm:text-3xl">{perfil.usuario.nombre}</h1>
              {perfil.verificado && (
                <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                  ✓ Verificado
                </span>
              )}
              {perfil.destacado && (
                <span className="rounded-full bg-orange/10 px-2.5 py-0.5 text-xs font-semibold text-orange">
                  ★ Destacado
                </span>
              )}
            </div>

            {perfil.titulo && (
              <p className="mt-1 text-lg text-text">{perfil.titulo}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-text-light">
              {perfil.oficios.length > 0 && (
                <span>{perfil.oficios.map((o) => `${o.oficio.icono} ${o.oficio.nombre}`).join(" · ")}</span>
              )}
              {perfil.anosExperiencia != null && (
                <span>{perfil.anosExperiencia} años de experiencia</span>
              )}
            </div>

            {/* Rating */}
            <div className="mt-3 flex items-center gap-2">
              <Estrellas cantidad={Math.round(promedioEstrellas)} />
              <span className="text-sm font-semibold text-navy">{promedioEstrellas}</span>
              <span className="text-sm text-text-light">({totalResenas} reseñas)</span>
            </div>

            {/* Precio */}
            <div className="mt-3">
              {perfil.tipoPrecio === "por_hora" && perfil.precioPorHora ? (
                <span className="text-lg font-bold text-orange">
                  ${perfil.precioPorHora.toLocaleString("es-AR")} <span className="text-sm font-normal text-text-light">/ hora</span>
                </span>
              ) : (
                <span className="text-sm font-medium text-text-light">Presupuesto a convenir</span>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {perfil.whatsapp && whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark"
              >
                <IconoWhatsApp className="h-4 w-4" />
                Enviar WhatsApp
              </a>
            )}
            {session && (
              <button
                onClick={handleContactar}
                disabled={cargandoChat}
                className="flex items-center gap-2 rounded-lg border border-navy px-6 py-3 font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle className="h-4 w-4" />
                {cargandoChat ? "Abriendo chat..." : "Enviar mensaje"}
              </button>
            )}
            {esPropietario && (
              <Link
                href="/profesional/perfil"
                className="text-sm text-orange hover:underline"
              >
                Editar mi perfil
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Descripción */}
          {perfil.descripcion && (
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 text-lg font-semibold text-navy">Sobre mí</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-text">{perfil.descripcion}</p>
            </section>
          )}

          {/* Video */}
          {perfil.videoUrl && (
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 text-lg font-semibold text-navy">
                <Play className="mr-1 inline h-5 w-5" />
                Video de presentación
              </h2>
              <div className="aspect-video overflow-hidden rounded-lg">
                <iframe
                  src={perfil.videoUrl.replace("watch?v=", "embed/")}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* Galería */}
          {perfil.galeriaFotos.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 text-lg font-semibold text-navy">
                <Camera className="mr-1 inline h-5 w-5" />
                Trabajos realizados ({perfil.galeriaFotos.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {perfil.galeriaFotos.map((foto) => (
                  <div key={foto.id} className="aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={foto.url} alt={foto.descripcion || ""} className="h-full w-full object-cover transition-transform hover:scale-105" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reseñas */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy">
                Reseñas ({totalResenas})
              </h2>
              {puedeResenar && (
                <button
                  onClick={() => setMostrarFormResena(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-orange/10 px-3 py-1.5 text-sm font-medium text-orange hover:bg-orange/20 transition-colors"
                >
                  <PenSquare className="h-3.5 w-3.5" />
                  Dejar reseña
                </button>
              )}
              {yaReseno && (
                <span className="text-xs text-text-light">
                  Ya dejaste tu reseña
                </span>
              )}
            </div>

            {perfil.resenas.length > 0 ? (
              <div className="space-y-4">
                {perfil.resenas.map((resena) => (
                  <div key={resena.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      {resena.cliente.imagen ? (
                        <img src={resena.cliente.imagen} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-bold text-navy">
                          {resena.cliente.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-navy">{resena.cliente.nombre}</p>
                        <Estrellas cantidad={resena.puntuacion} />
                      </div>
                      <span className="ml-auto text-xs text-text-light">
                        {new Date(resena.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-text">{resena.comentario}</p>
                    {resena.fotoUrl && (
                      <img src={resena.fotoUrl} alt="Foto del trabajo" className="mt-2 h-24 w-24 rounded-lg object-cover" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-light text-center py-4">
                Todavía no hay reseñas para este profesional
              </p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ubicación */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">Ubicación</h3>
            <div className="space-y-2 text-sm text-text">
              {perfil.ciudad && (
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-text-light" /> {perfil.ciudad}{perfil.barrio ? `, ${perfil.barrio}` : ""}</p>
              )}
              {perfil.direccion && <p className="text-text-light">{perfil.direccion}</p>}
            </div>
          </section>

          {/* Horarios */}
          {perfil.horarios.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">
                <Clock className="mr-1 inline h-4 w-4" />
                Horarios
              </h3>
              <div className="space-y-1.5">
                {perfil.horarios.map((h) => (
                  <div key={h.diaSemana} className="flex justify-between text-sm">
                    <span className={h.diaSemana === hoy ? "font-bold text-orange" : h.activo ? "text-text" : "text-text-light"}>
                      {diasSemana[h.diaSemana]}{h.diaSemana === hoy ? " (hoy)" : ""}
                    </span>
                    <span className={h.activo ? "text-text" : "text-text-light"}>
                      {h.activo ? `${h.horaInicio} - ${h.horaFin}` : "Cerrado"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contacto */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">Contacto</h3>
            <div className="space-y-2 text-sm">
              {perfil.whatsapp && whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-text hover:text-orange">
                  <IconoWhatsApp className="h-4 w-4" /> {whatsappMostrar}
                </a>
              )}
              {perfil.sitioWeb && (
                <a href={perfil.sitioWeb} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-text hover:text-orange">
                  <Globe className="h-4 w-4" /> Sitio web
                </a>
              )}
              {perfil.instagram && (
                <a href={`https://instagram.com/${perfil.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-text hover:text-orange">
                  <ExternalLink className="h-4 w-4" /> Instagram: {perfil.instagram}
                </a>
              )}
              {perfil.facebook && (
                <a href={perfil.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-text hover:text-orange">
                  <ExternalLink className="h-4 w-4" /> Facebook
                </a>
              )}
            </div>
          </section>

          {/* Certificaciones */}
          {perfil.certificaciones.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">
                <Award className="mr-1 inline h-4 w-4" />
                Certificaciones
              </h3>
              <div className="space-y-2">
                {perfil.certificaciones.map((cert) => (
                  <div key={cert.id} className="flex items-center gap-2 text-sm text-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    {cert.nombre}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Modal de reseña */}
      <ReviewForm
        perfilId={perfil.id}
        nombreProfesional={perfil.usuario.nombre}
        abierto={mostrarFormResena}
        onCerrar={() => setMostrarFormResena(false)}
        onResenaCreada={() => {
          // Recargar la página para mostrar la nueva reseña
          window.location.reload();
        }}
      />
    </div>
  );
}
