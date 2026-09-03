/**
 * MensajesThread - Panel derecho del chat (mensajes)
 * 
 * Muestra:
 * - Header con info del otro participante
 * - Lista de mensajes con scroll
 * - Indicador de "escribiendo..."
 * - Scroll automático al último mensaje
 * - Paginación al hacer scroll hacia arriba
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Shield, Loader2, ChevronUp, PenSquare, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useChat, type Mensaje } from "@/contexts/ChatContext";
import { ChatInput } from "./ChatInput";
import { ReviewForm } from "@/components/reviews/ReviewForm";

/** Formatear hora del mensaje */
function formatearHora(fecha: string): string {
  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formatear fecha completa (para separadores de día) */
function formatearFechaCompleta(fecha: string): string {
  const date = new Date(fecha);
  const ahora = new Date();
  const diffDias = Math.floor(
    (ahora.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Ayer";

  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Indicador de que el otro usuario está escribiendo */
function TypingIndicator({ nombre }: { nombre: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex gap-0.5">
        <span className="h-1.5 w-1.5 bg-text-light rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 bg-text-light rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 bg-text-light rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-xs text-text-light">{nombre} está escribiendo...</span>
    </div>
  );
}

/** Separador de fecha entre mensajes */
function SeparadorFecha({ fecha }: { fecha: string }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-text-light font-medium">
        {formatearFechaCompleta(fecha)}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/** burbuja de mensaje individual */
function BurbujaMensaje({
  mensaje,
  esMio,
  mostrarAvatar,
}: {
  mensaje: Mensaje;
  esMio: boolean;
  mostrarAvatar: boolean;
}) {
  const anchoAvatar = 32; // 8 * 4 = 32px

  return (
    <div className={`flex gap-2 px-4 ${esMio ? "justify-end" : "justify-start"}`}>
      {/* Avatar del emisor (solo si no es mío) */}
      {!esMio && mostrarAvatar && (
        <div className="flex-shrink-0 w-8">
          {mensaje.emisor.imagen ? (
            <img
              src={mensaje.emisor.imagen}
              alt={mensaje.emisor.nombre}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-navy-light flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {mensaje.emisor.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      )}
      {!esMio && !mostrarAvatar && <div className="flex-shrink-0 w-8" />}

      {/* Burbuja del mensaje */}
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          esMio
            ? "bg-navy text-white rounded-br-sm"
            : "bg-card border border-border text-text rounded-bl-sm"
        }`}
      >
        {/* Adjunto (imagen o archivo) */}
        {mensaje.adjuntoUrl && (
          <div className="mb-1">
            {mensaje.adjuntoTipo?.startsWith("image/") ? (
              <a
                href={mensaje.adjuntoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mensaje.adjuntoUrl}
                  alt={mensaje.adjuntoNombre || "Adjunto"}
                  className="max-h-56 w-full rounded-lg object-cover border border-black/10"
                />
              </a>
            ) : (
              <a
                href={mensaje.adjuntoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium underline-offset-2 ${
                  esMio ? "bg-white/10 text-white" : "bg-surface text-navy"
                }`}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{mensaje.adjuntoNombre || "Adjunto"}</span>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              </a>
            )}
          </div>
        )}

        {mensaje.contenido && (
          <p className="text-sm whitespace-pre-wrap break-words">{mensaje.contenido}</p>
        )}
        <div
          className={`flex items-center gap-1 mt-0.5 ${
            esMio ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] ${
              esMio ? "text-blue-200" : "text-text-light"
            }`}
          >
            {formatearHora(mensaje.createdAt)}
          </span>
          {/* Check de leído (solo para mensajes propios) */}
          {esMio && (
            <span className="text-[10px]">
              {mensaje.leido ? (
                <span className="text-blue-200">✓✓</span>
              ) : (
                <span className="text-blue-300">✓</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MensajesThread() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const {
    conversaciones,
    conversacionActiva,
    mensajes,
    hayMasMensajes,
    cargandoMensajes,
    typingUsers,
    enviarMensaje,
    cargarMasMensajes,
    enviarTyping,
    setConversacionActiva,
  } = useChat();

  // Refs para scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef<HTMLButtonElement>(null);

  // Obtener datos de la conversación activa
  const conversacion = conversaciones.find((c) => c.id === conversacionActiva);

  // Nombre del otro participante para el header
  const otroNombre = conversacion
    ? conversacion.clienteId === userId
      ? conversacion.profesional.usuario.nombre
      : conversacion.cliente.nombre
    : "";

  const otroImagen = conversacion
    ? conversacion.clienteId === userId
      ? conversacion.profesional.usuario.imagen
      : conversacion.cliente.imagen
    : null;

  const otroOficio = conversacion
    ? conversacion.clienteId === userId
      ? conversacion.profesional.oficios?.[0]?.oficio?.nombre
      : undefined
    : undefined;

  // Verificar si alguien está escribiendo
  const hayTyping = Array.from(typingUsers.values()).some(Boolean);

  // Estado para el modal de reseña
  const [mostrarFormResena, setMostrarFormResena] = useState(false);

  // Verificar si el usuario actual es cliente (puede dejar reseña)
  const esCliente = session?.user?.rol === "CLIENTE";
  // El perfilId del profesional en esta conversación
  const perfilId = conversacion?.profesional?.id;

  // =============================================
  // SCROLL AUTOMÁTICO AL ÚLTIMO MENSAJE
  // =============================================
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Solo hacer scroll si estamos cerca del fondo (para no molestar al usuario scrolleando)
    const distanciaDelFondo = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanciaDelFondo < 200) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [mensajes, hayTyping]);

  // =============================================
  // SCROLL INICIAL AL ABRIR UNA CONVERSACIÓN
  // =============================================
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && conversacionActiva) {
      // Scroll instantáneo al fondo al cambiar de conversación
      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }, [conversacionActiva]);

  // No hay conversación seleccionada
  if (!conversacionActiva || !conversacion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface">
        <div className="text-center">
          <div className="h-16 w-16 bg-navy-light rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold text-text mb-1">
            Seleccioná una conversación
          </h3>
          <p className="text-sm text-text-light">
            Elegí una conversación de la izquierda o iniciá una nueva
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface">
      {/* Header de la conversación */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
        {/* Botón volver (solo en móvil) */}
        <button
          onClick={() => setConversacionActiva(null)}
          className="md:hidden p-1 hover:bg-surface rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>

        {/* Avatar del otro */}
        {otroImagen ? (
          <img
            src={otroImagen}
            alt={otroNombre}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-navy-light flex items-center justify-center">
            <span className="text-white font-bold">
              {otroNombre.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm text-text truncate">
              {otroNombre}
            </h3>
            {conversacion.profesional.verificado && (
              <Shield className="h-3.5 w-3.5 text-navy-light flex-shrink-0" />
            )}
          </div>
          {otroOficio && (
            <p className="text-xs text-navy-light">{otroOficio}</p>
          )}
        </div>

        {/* Acciones del header */}
        <div className="flex items-center gap-1">
          {/* Ver perfil */}
          <Link
            href={`/perfil/${conversacion.profesional.id}`}
            className="p-2 rounded-lg hover:bg-surface transition-colors text-text-light hover:text-navy"
            title="Ver perfil"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>

          {/* Dejar reseña (solo para clientes) */}
          {esCliente && perfilId && (
            <button
              onClick={() => setMostrarFormResena(true)}
              className="p-2 rounded-lg hover:bg-surface transition-colors text-text-light hover:text-orange"
              title="Dejar reseña"
            >
              <PenSquare className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Área de mensajes */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-2 space-y-1"
      >
        {/* Botón cargar más mensajes */}
        {hayMasMensajes && (
          <div className="flex justify-center py-2">
            <button
              onClick={cargarMasMensajes}
              disabled={cargandoMensajes}
              className="flex items-center gap-1 text-xs text-navy-light hover:text-navy transition-colors"
            >
              {cargandoMensajes ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
              {cargandoMensajes ? "Cargando..." : "Cargar mensajes anteriores"}
            </button>
          </div>
        )}

        {/* Lista de mensajes */}
        {mensajes.map((msg, idx) => {
          const esMio = msg.emisorId === userId;
          const msgAnterior = idx > 0 ? mensajes[idx - 1] : null;
          const msgSiguiente = idx < mensajes.length - 1 ? mensajes[idx + 1] : null;

          // Mostrar avatar si es el primer mensaje de un bloque del mismo emisor
          const mostrarAvatar =
            !esMio &&
            (!msgAnterior ||
              msgAnterior.emisorId !== msg.emisorId);

          // Separador de fecha si hay cambio de día
          const mostrarSeparador =
            !msgAnterior ||
            new Date(msg.createdAt).toDateString() !==
              new Date(msgAnterior.createdAt).toDateString();

          return (
            <div key={msg.id}>
              {mostrarSeparador && <SeparadorFecha fecha={msg.createdAt} />}
              <div className={`${!msgSiguiente || msgSiguiente.emisorId !== msg.emisorId ? "pb-1" : "pb-0.5"}`}>
                <BurbujaMensaje
                  mensaje={msg}
                  esMio={esMio}
                  mostrarAvatar={mostrarAvatar}
                />
              </div>
            </div>
          );
        })}

        {/* Indicador de typing */}
        {hayTyping && <TypingIndicator nombre={otroNombre} />}
      </div>

      {/* Input para enviar mensajes */}
      <ChatInput
        onEnviar={enviarMensaje}
        onTyping={(escribiendo: boolean) =>
          enviarTyping(conversacionActiva, escribiendo)
        }
      />

      {/* Modal de reseña */}
      {perfilId && (
        <ReviewForm
          perfilId={perfilId}
          nombreProfesional={otroNombre}
          abierto={mostrarFormResena}
          onCerrar={() => setMostrarFormResena(false)}
          onResenaCreada={() => {
            setMostrarFormResena(false);
          }}
        />
      )}
    </div>
  );
}
