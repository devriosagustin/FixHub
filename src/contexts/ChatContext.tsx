/**
 * ChatProvider - Proveedor de contexto para el chat
 * 
 * Maneja:
 * - Conexión Socket.io
 * - Lista de conversaciones
 * - Conversación activa
 * - Mensajes de la conversación actual
 * - Conteo de mensajes no leídos
 * - Eventos en tiempo real (nuevo mensaje, typing, leído)
 * 
 * Se usa envolviendo las páginas de chat en layout.tsx
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";

// =============================================
// TIPOS
// =============================================

/** Usuario básico que aparece en conversaciones */
interface UsuarioChat {
  id: string;
  nombre: string;
  imagen: string | null;
}

/** Datos del profesional en una conversación */
interface ProfesionalChat {
  id: string;
  usuario: UsuarioChat;
  oficios: { oficio: { nombre: string } }[];
  verificado: boolean;
}

/** Conversación con datos del otro participante y preview */
export interface Conversacion {
  id: string;
  clienteId: string;
  profesionalId: string;
  ultimoMensajeAt: string;
  cliente: UsuarioChat;
  profesional: ProfesionalChat;
  mensajes: { contenido: string; emisorId: string; createdAt: string }[];
  mensajesNoLeidos: number;
}

/** Mensaje individual en el chat */
export interface Mensaje {
  id: string;
  conversacionId: string;
  emisorId: string;
  contenido: string;
  adjuntoUrl?: string | null;
  adjuntoTipo?: string | null;
  adjuntoNombre?: string | null;
  leido: boolean;
  createdAt: string;
  emisor: UsuarioChat;
}

/** Datos de typing de otro usuario */
interface TypingData {
  userId: string;
  conversacionId: string;
  estaEscribiendo: boolean;
}

// =============================================
// CONTEXTO
// =============================================

interface ChatContextType {
  // Estado
  conversaciones: Conversacion[];
  conversacionActiva: string | null;
  mensajes: Mensaje[];
  hayMasMensajes: boolean;
  cargandoMensajes: boolean;
  totalNoLeidos: number;
  conectado: boolean;
  typingUsers: Map<string, boolean>; // userId -> estaEscribiendo

  // Acciones
  setConversacionActiva: (id: string | null) => void;
  enviarMensaje: (
    contenido: string,
    adjunto?: { url: string; tipo: string; nombre: string }
  ) => void;
  cargarMasMensajes: () => Promise<void>;
  crearConversacion: (perfilProfesionalId: string) => Promise<Conversacion>;
  marcarLeido: (conversacionId: string) => void;
  enviarTyping: (conversacionId: string, estaEscribiendo: boolean) => void;
  actualizarNoLeidos: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

// =============================================
// HOOK PARA USAR EL CONTEXTO
// =============================================

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat debe usarse dentro de ChatProvider");
  }
  return ctx;
}

// =============================================
// PROVIDER
// =============================================

export function ChatProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { socket, conectado } = useSocket();
  const userId = session?.user?.id;

  // Estado
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [hayMasMensajes, setHayMasMensajes] = useState(false);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [totalNoLeidos, setTotalNoLeidos] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());

  // Ref para el cursor de paginación
  const primerMensajeId = useRef<string | null>(null);

  // =============================================
  // CARGAR CONVERSACIONES
  // =============================================
  const cargarConversaciones = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversaciones");
      if (!res.ok) return;
      const data = await res.json();
      setConversaciones(data.conversaciones || []);

      // Calcular total de no leídos
      const total = (data.conversaciones || []).reduce(
        (sum: number, c: Conversacion) => sum + c.mensajesNoLeidos,
        0
      );
      setTotalNoLeidos(total);
    } catch (err) {
      console.error("Error al cargar conversaciones:", err);
    }
  }, []);

  // Cargar conversaciones al tener sesión
  useEffect(() => {
    if (userId) {
      cargarConversaciones();
    }
  }, [userId, cargarConversaciones]);

  // =============================================
  // CARGAR MENSAJES DE UNA CONVERSACIÓN
  // =============================================
  const cargarMensajes = useCallback(
    async (conversacionId: string, append = false) => {
      setCargandoMensajes(true);
      try {
        const cursorParam = append && primerMensajeId.current
          ? `?cursor=${primerMensajeId.current}`
          : "";
        
        const res = await fetch(
          `/api/chat/conversaciones/${conversacionId}/mensajes${cursorParam}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const nuevosMensajes: Mensaje[] = data.mensajes || [];

        if (append && mensajes.length > 0) {
          // Agregar mensajes anteriores al inicio
          setMensajes((prev) => [...nuevosMensajes, ...prev]);
        } else {
          setMensajes(nuevosMensajes);
        }

        setHayMasMensajes(data.hayMas || false);

        // Guardar el ID del primer mensaje para paginación
        if (nuevosMensajes.length > 0) {
          primerMensajeId.current = nuevosMensajes[0].id;
        }
      } catch (err) {
        console.error("Error al cargar mensajes:", err);
      } finally {
        setCargandoMensajes(false);
      }
    },
    [mensajes.length]
  );

  // Cargar mensajes cuando cambia la conversación activa
  useEffect(() => {
    if (conversacionActiva) {
      primerMensajeId.current = null;
      setMensajes([]);
      cargarMensajes(conversacionActiva);

      // Unirse a la conversación en el socket
      if (socket) {
        socket.emit("join_conversacion", conversacionActiva);
      }

      // Marcar como leído
      marcarLeido(conversacionActiva);
    }
  }, [conversacionActiva, socket]); // eslint-disable-line react-hooks/exhaustive-deps

  // =============================================
  // CARGAR MÁS MENSAJES (scroll hacia arriba)
  // =============================================
  const cargarMasMensajes = useCallback(async () => {
    if (!conversacionActiva || cargandoMensajes || !hayMasMensajes) return;
    await cargarMensajes(conversacionActiva, true);
  }, [conversacionActiva, cargandoMensajes, hayMasMensajes, cargarMensajes]);

  // =============================================
  // ENVIAR MENSAJE
  // =============================================
  const enviarMensaje = useCallback(
    (contenido: string, adjunto?: { url: string; tipo: string; nombre: string }) => {
      if (!socket || !conversacionActiva) return;
      if ((!contenido || !contenido.trim()) && !adjunto) return;

      // Enviar vía socket (el servidor persiste y emite de vuelta)
      socket.emit("enviar_mensaje", {
        conversacionId: conversacionActiva,
        contenido: (contenido || "").trim(),
        adjuntoUrl: adjunto?.url,
        adjuntoTipo: adjunto?.tipo,
        adjuntoNombre: adjunto?.nombre,
      });

      // Dejar de mostrar typing
      socket.emit("typing", {
        conversacionId: conversacionActiva,
        estaEscribiendo: false,
      });
    },
    [socket, conversacionActiva]
  );

  // =============================================
  // CREAR CONVERSACIÓN
  // =============================================
  const crearConversacion = useCallback(
    async (perfilProfesionalId: string): Promise<Conversacion> => {
      const res = await fetch("/api/chat/conversaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilProfesionalId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear conversación");
      }

      const data = await res.json();
      const nueva: Conversacion = data.conversacion;

      // Actualizar la lista de conversaciones
      setConversaciones((prev) => {
        // Verificar si ya existía
        const idx = prev.findIndex((c) => c.id === nueva.id);
        if (idx >= 0) {
          // Actualizar la existente y moverla al inicio
          const actualizadas = [...prev];
          actualizadas.splice(idx, 1);
          return [{ ...nueva, mensajesNoLeidos: 0, mensajes: [] }, ...actualizadas];
        }
        // Agregar la nueva al inicio
        return [{ ...nueva, mensajesNoLeidos: 0, mensajes: [] }, ...prev];
      });

      return nueva;
    },
    []
  );

  // =============================================
  // MARCAR COMO LEÍDO
  // =============================================
  const marcarLeido = useCallback(
    async (conversacionId: string) => {
      // Marcar vía API (persistente)
      fetch(`/api/chat/conversaciones/${conversacionId}/leer`, {
        method: "PATCH",
      });

      // También marcar vía socket para notificar al otro usuario
      if (socket) {
        socket.emit("marcar_leido", { conversacionId });
      }

      // Actualizar el contador local
      setConversaciones((prev) =>
        prev.map((c) =>
          c.id === conversacionId ? { ...c, mensajesNoLeidos: 0 } : c
        )
      );

      // Recalcular total
      await cargarConversaciones();
    },
    [socket, cargarConversaciones]
  );

  // =============================================
  // ACTUALIZAR NO LEÍDOS
  // =============================================
  const actualizarNoLeidos = useCallback(async () => {
    await cargarConversaciones();
  }, [cargarConversaciones]);

  // =============================================
  // ENVIAR TYPING INDICATOR
  // =============================================
  const enviarTyping = useCallback(
    (conversacionId: string, estaEscribiendo: boolean) => {
      if (!socket) return;
      socket.emit("typing", { conversacionId, estaEscribiendo });
    },
    [socket]
  );

  // =============================================
  // EVENTOS DE SOCKET (efectos)
  // =============================================
  useEffect(() => {
    if (!socket) return;

    // =============================================
    // NUEVO MENSAJE RECIBIDO
    // =============================================
    const handleNuevoMensaje = (mensaje: Mensaje) => {
      // Si es de la conversación activa, agregarlo a la lista
      if (mensaje.conversacionId === conversacionActiva) {
        setMensajes((prev) => {
          // Evitar duplicados por ID
          if (prev.some((m) => m.id === mensaje.id)) return prev;
          return [...prev, mensaje];
        });

        // Marcar como leído automáticamente si estoy en esa conversación
        if (mensaje.emisorId !== userId) {
          fetch(`/api/chat/conversaciones/${mensaje.conversacionId}/leer`, {
            method: "PATCH",
          });
          socket.emit("marcar_leido", {
            conversacionId: mensaje.conversacionId,
          });
        }
      }

      // Actualizar la conversación en la lista (último mensaje, no leídos)
      setConversaciones((prev) => {
        const idx = prev.findIndex((c) => c.id === mensaje.conversacionId);
        if (idx < 0) return prev;

        const actualizadas = [...prev];
        const conv = { ...actualizadas[idx] };

        // Actualizar preview del último mensaje
        const preview = mensaje.contenido
          ? mensaje.contenido
          : mensaje.adjuntoUrl
          ? `📎 Adjunto: ${mensaje.adjuntoNombre || "archivo"}`
          : "";
        conv.mensajes = [
          {
            contenido: preview,
            emisorId: mensaje.emisorId,
            createdAt: mensaje.createdAt,
          },
        ];
        conv.ultimoMensajeAt = mensaje.createdAt;

        // Incrementar no leídos si el mensaje no es mío y no estoy en la conversación
        if (mensaje.emisorId !== userId && mensaje.conversacionId !== conversacionActiva) {
          conv.mensajesNoLeidos = (conv.mensajesNoLeidos || 0) + 1;
        }

        // Mover al inicio de la lista
        actualizadas.splice(idx, 1);
        actualizadas.unshift(conv);

        return actualizadas;
      });

      // Recalcular total de no leídos
      if (mensaje.emisorId !== userId && mensaje.conversacionId !== conversacionActiva) {
        setTotalNoLeidos((prev) => prev + 1);
      }
    };

    // =============================================
    // TYPING INDICATOR
    // =============================================
    const handleTyping = (data: TypingData) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.conversacionId === conversacionActiva) {
          next.set(data.userId, data.estaEscribiendo);
        }
        return next;
      });
    };

    // =============================================
    // MENSAJES LEÍDOS POR EL OTRO USUARIO
    // =============================================
    const handleMensajesLeidos = (data: {
      conversacionId: string;
      leidoPor: string;
    }) => {
      if (data.conversacionId === conversacionActiva) {
        // Marcar todos los mensajes enviados por mí como leídos
        setMensajes((prev) =>
          prev.map((m) =>
            m.emisorId === userId ? { ...m, leido: true } : m
          )
        );
      }
    };

    // =============================================
    // NOTIFICACIÓN DE NUEVO MENSAJE (cuando no estoy en la conversación)
    // =============================================
    const handleNotificacion = (data: {
      conversacionId: string;
      mensaje: Mensaje;
    }) => {
      // Aquí se podría mostrar una notificación toast/browser notification
      console.log("[Chat] Notificación de nuevo mensaje:", data.mensaje);
      
      // Si el navegador soporta notificaciones y el usuario las permitió
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Nuevo mensaje", {
          body: `${data.mensaje.emisor.nombre}: ${data.mensaje.contenido}`,
          icon: data.mensaje.emisor.imagen || undefined,
        });
      }
    };

    // Registrar listeners
    socket.on("nuevo_mensaje", handleNuevoMensaje);
    socket.on("user_typing", handleTyping);
    socket.on("mensajes_leidos", handleMensajesLeidos);
    socket.on("notificacion_mensaje", handleNotificacion);

    // Limpiar listeners al desmontar o cambiar dependencias
    return () => {
      socket.off("nuevo_mensaje", handleNuevoMensaje);
      socket.off("user_typing", handleTyping);
      socket.off("mensajes_leidos", handleMensajesLeidos);
      socket.off("notificacion_mensaje", handleNotificacion);
    };
  }, [socket, conversacionActiva, userId]);

  // =============================================
  // PEDIR PERMISO DE NOTIFICACIONES
  // =============================================
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // =============================================
  // VALUE DEL CONTEXTO
  // =============================================
  const value: ChatContextType = {
    conversaciones,
    conversacionActiva,
    mensajes,
    hayMasMensajes,
    cargandoMensajes,
    totalNoLeidos,
    conectado,
    typingUsers,
    setConversacionActiva,
    enviarMensaje,
    cargarMasMensajes,
    crearConversacion,
    marcarLeido,
    enviarTyping,
    actualizarNoLeidos,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
