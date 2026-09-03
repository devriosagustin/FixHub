/**
 * ConversacionesList - Panel izquierdo del chat
 * 
 * Muestra la lista de conversaciones del usuario con:
 * - Foto y nombre del otro participante
 * - Preview del último mensaje
 * - Badge de mensajes no leídos
 * - Indicador de.online/offline
 * - Filtro de búsqueda
 * 
 * Al hacer clic en una conversación, se selecciona como activa.
 */

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Search, MessageCircle, Check, CheckCheck } from "lucide-react";
import { useChat, type Conversacion } from "@/contexts/ChatContext";

/** Obtener el otro participante de la conversación según el rol */
function getOtroParticipante(
  conv: Conversacion,
  userId: string
): { nombre: string; imagen: string | null; oficio?: string } {
  if (conv.clienteId === userId) {
    // Soy el cliente, el otro es el profesional
    const oficio = conv.profesional.oficios?.[0]?.oficio?.nombre;
    return {
      nombre: conv.profesional.usuario.nombre,
      imagen: conv.profesional.usuario.imagen,
      oficio,
    };
  }
  // Soy el profesional, el otro es el cliente
  return {
    nombre: conv.cliente.nombre,
    imagen: conv.cliente.imagen,
  };
}

/** Formatear fecha del último mensaje */
function formatearFecha(fecha: string): string {
  const date = new Date(fecha);
  const ahora = new Date();
  const diffMs = ahora.getTime() - date.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Hoy: mostrar hora
  if (diffDias === 0) {
    return date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  // Ayer
  if (diffDias === 1) return "Ayer";
  // Esta semana
  if (diffDias < 7) {
    return date.toLocaleDateString("es-AR", { weekday: "short" });
  }
  // Más antiguo
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function ConversacionesList() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const {
    conversaciones,
    conversacionActiva,
    setConversacionActiva,
  } = useChat();

  // Filtro de búsqueda por nombre
  const [busqueda, setBusqueda] = useState("");

  // Filtrar conversaciones por nombre del otro participante
  const conversacionesFiltradas = conversaciones.filter((conv) => {
    if (!busqueda.trim()) return true;
    const otro = getOtroParticipante(conv, userId || "");
    return otro.nombre.toLowerCase().includes(busqueda.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-navy mb-3">Mensajes</h2>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light" />
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface rounded-lg border border-border text-sm focus:outline-none focus:border-navy-light transition-colors"
          />
        </div>
      </div>

      {/* Lista de conversaciones */}
      <div className="flex-1 overflow-y-auto">
        {conversacionesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageCircle className="h-12 w-12 text-text-light mb-3" />
            <p className="text-text-light text-sm">
              {busqueda
                ? "No se encontraron conversaciones"
                : "No tienes conversaciones aún"}
            </p>
            <p className="text-text-light text-xs mt-1">
              {!busqueda && "Visita el perfil de un profesional para iniciar una conversación"}
            </p>
          </div>
        ) : (
          conversacionesFiltradas.map((conv) => {
            const otro = getOtroParticipante(conv, userId || "");
            const isActive = conv.id === conversacionActiva;
            const ultimoMensaje = conv.mensajes?.[0];
            const noLeidos = conv.mensajesNoLeidos || 0;

            return (
              <button
                key={conv.id}
                onClick={() => setConversacionActiva(conv.id)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-surface transition-colors text-left ${
                  isActive ? "bg-surface border-r-2 border-orange" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {otro.imagen ? (
                    <img
                      src={otro.imagen}
                      alt={otro.nombre}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-navy-light flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {otro.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm text-text truncate">
                      {otro.nombre}
                    </span>
                    {ultimoMensaje && (
                      <span className="text-xs text-text-light flex-shrink-0 ml-2">
                        {formatearFecha(ultimoMensaje.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Oficio o último mensaje */}
                  {otro.oficio ? (
                    <p className="text-xs text-navy-light font-medium mb-0.5">
                      {otro.oficio}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-light truncate flex-1">
                      {ultimoMensaje
                        ? ultimoMensaje.emisorId === userId
                          ? `Tú: ${ultimoMensaje.contenido}`
                          : ultimoMensaje.contenido
                        : "Iniciar conversación"}
                    </p>

                    {/* Badge de no leídos */}
                    {noLeidos > 0 && (
                      <span className="flex-shrink-0 ml-2 bg-orange text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                        {noLeidos > 99 ? "99+" : noLeidos}
                      </span>
                    )}

                    {/* Indicador de leído/no leído para el último mensaje propio */}
                    {ultimoMensaje && ultimoMensaje.emisorId === userId && (
                      <span className="flex-shrink-0 ml-1">
                        {conv.mensajesNoLeidos === 0 ? (
                          <CheckCheck className="h-3.5 w-3.5 text-navy-light" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-text-light" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
