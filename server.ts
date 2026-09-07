/**
 * Servidor personalizado con Socket.io para chat en tiempo real
 * 
 * Este archivo reemplaza el comando "next dev" estándar para 
 * integrar Socket.io junto con Next.js.
 * 
 * En producción, se usa "next build && node server.ts"
 * En desarrollo, se usa "tsx watch server.ts"
 */

import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "./src/lib/prisma";
import { renovarSuscripcionesVencidas } from "./src/lib/suscripcion";

// Detectar si estamos en modo desarrollo
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Crear la app de Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Crear servidor HTTP que sirve Next.js
  // Primero creamos el servidor SIN callback, luego engine.io se attach,
  // y finalmente agregamos handle de Next.js como listener manual.
  const httpServer = createServer();

  // Crear servidor Socket.io pegado al servidor HTTP
  // Socket.io/engine.io se attach primero para tener prioridad sobre handle()
  const io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: dev ? `http://${hostname}:${port}` : process.env.NEXTAUTH_URL,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Ahora attach el handler de Next.js (después de Socket.io)
  httpServer.on("request", (req, res) => {
    handle(req, res);
  });

  // =============================================
  // MAPA DE USUARIOS CONECTADOS
  // =============================================
  // userId -> Set de socketIds (un usuario puede tener múltiples pestañas)
  const usuariosConectados = new Map<string, Set<string>>();

  // =============================================
  // AUTENTICACIÓN DEL SOCKET
  // =============================================
  // Extraer el token JWT de las cookies para identificar al usuario
  async function autenticarSocket(socket: any): Promise<string | null> {
    try {
      // Validar usando la API de sesión de NextAuth
      const cookies = socket.handshake.headers.cookie || "";
      const res = await fetch(`http://${hostname}:${port}/api/auth/session`, {
        headers: { cookie: cookies },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.user?.id || null;
    } catch {
      return null;
    }
  }

  // =============================================
  // EVENTOS DE SOCKET.IO
  // =============================================
  io.on("connection", async (socket) => {
    // Autenticar al usuario al conectarse
    const userId = await autenticarSocket(socket);

    if (!userId) {
      // Si no se puede autenticar, desconectar
      socket.disconnect(true);
      return;
    }

    // Registrar al usuario como conectado
    if (!usuariosConectados.has(userId)) {
      usuariosConectados.set(userId, new Set());
    }
    usuariosConectados.get(userId)!.add(socket.id);

    // Unirse a una sala personalizada con el userId
    // Esto permite enviar mensajes directamente a un usuario
    socket.join(`user:${userId}`);

    console.log(`[Socket] Usuario ${userId} conectado (socket: ${socket.id})`);

    // =============================================
    // EVENTO: Unirse a una conversación
    // =============================================
    socket.on("join_conversacion", async (conversacionId: string) => {
      try {
        // Verificar que el usuario participa en esta conversación
        const conversacion = await prisma.conversacion.findUnique({
          where: { id: conversacionId },
          select: { clienteId: true, profesional: { select: { userId: true } } },
        });

        if (!conversacion) return;

        // Verificar si el usuario es el cliente o el profesional
        const esParticipante =
          conversacion.clienteId === userId ||
          conversacion.profesional.userId === userId;

        if (esParticipante) {
          socket.join(`conversacion:${conversacionId}`);
          console.log(`[Socket] Usuario ${userId} se unió a conversación ${conversacionId}`);
        }
      } catch (err) {
        console.error("[Socket] Error al unirse a conversación:", err);
      }
    });

    // =============================================
    // EVENTO: Enviar mensaje
    // =============================================
    socket.on(
      "enviar_mensaje",
      async (data: {
        conversacionId: string;
        contenido: string;
        adjuntoUrl?: string;
        adjuntoTipo?: string;
        adjuntoNombre?: string;
      }) => {
        try {
          const { conversacionId, contenido } = data;
          const adjuntoUrl = data.adjuntoUrl || null;
          const adjuntoTipo = data.adjuntoTipo || null;
          const adjuntoNombre = data.adjuntoNombre || null;

          if (
            (!contenido || contenido.trim().length === 0) &&
            !adjuntoUrl
          ) {
            return;
          }

          // Verificar que el usuario participa en la conversación
          const conversacion = await prisma.conversacion.findUnique({
            where: { id: conversacionId },
            select: {
              clienteId: true,
              profesional: { select: { userId: true, id: true } },
            },
          });

          if (!conversacion) return;

          const esCliente = conversacion.clienteId === userId;
          const esProfesional = conversacion.profesional.userId === userId;

          if (!esCliente && !esProfesional) return;

          // Crear el mensaje en la base de datos
          const mensaje = await prisma.mensaje.create({
            data: {
              conversacionId,
              emisorId: userId,
              contenido: (contenido || "").trim(),
              adjuntoUrl,
              adjuntoTipo,
              adjuntoNombre,
            },
            include: {
              emisor: {
                select: { id: true, nombre: true, imagen: true },
              },
            },
          });

          // Actualizar el timestamp del último mensaje en la conversación
          await prisma.conversacion.update({
            where: { id: conversacionId },
            data: { ultimoMensajeAt: new Date() },
          });

          // Emitir el mensaje a todos los participantes de la conversación
          io.to(`conversacion:${conversacionId}`).emit("nuevo_mensaje", {
            id: mensaje.id,
            conversacionId: mensaje.conversacionId,
            emisorId: mensaje.emisorId,
            contenido: mensaje.contenido,
            adjuntoUrl: mensaje.adjuntoUrl,
            adjuntoTipo: mensaje.adjuntoTipo,
            adjuntoNombre: mensaje.adjuntoNombre,
            leido: mensaje.leido,
            createdAt: mensaje.createdAt,
            emisor: mensaje.emisor,
          });

          // Enviar notificación al otro usuario si no está en la conversación
          const receptorId = esCliente
            ? conversacion.profesional.userId
            : conversacion.clienteId;

          // Verificar si el receptor está en la conversación
          const socketsReceptor = usuariosConectados.get(receptorId);
          const estaEnConversacion = socketsReceptor
            ? Array.from(socketsReceptor).some((sid) => {
                const s = io.sockets.sockets.get(sid);
                return s?.rooms.has(`conversacion:${conversacionId}`);
              })
            : false;

          if (!estaEnConversacion) {
            // El receptor no está viendo esta conversación, enviar notificación
            const textoNotificacion = mensaje.contenido
              ? mensaje.contenido
              : mensaje.adjuntoUrl
              ? `Envió un adjunto (${mensaje.adjuntoNombre || "archivo"})`
              : "";
            io.to(`user:${receptorId}`).emit("notificacion_mensaje", {
              conversacionId,
              mensaje: {
                id: mensaje.id,
                contenido: mensaje.contenido,
                adjuntoUrl: mensaje.adjuntoUrl,
                adjuntoTipo: mensaje.adjuntoTipo,
                adjuntoNombre: mensaje.adjuntoNombre,
                emisor: mensaje.emisor,
                createdAt: mensaje.createdAt,
              },
            });

            // Crear notificación persistente en la BD
            await prisma.notificacion.create({
              data: {
                usuarioId: receptorId,
                tipo: "NUEVO_MENSAJE",
                titulo: `Nuevo mensaje de ${mensaje.emisor.nombre}`,
                mensaje: textoNotificacion.slice(0, 100),
                enlace: `/chat?conversacion=${conversacionId}`,
              },
            });
          }
        } catch (err) {
          console.error("[Socket] Error al enviar mensaje:", err);
        }
      }
    );

    // =============================================
    // EVENTO: Marcar mensajes como leídos
    // =============================================
    socket.on(
      "marcar_leido",
      async (data: { conversacionId: string }) => {
        try {
          // Marcar todos los mensajes no leídos de OTRAS personas como leídos
          await prisma.mensaje.updateMany({
            where: {
              conversacionId: data.conversacionId,
              emisorId: { not: userId },
              leido: false,
            },
            data: { leido: true },
          });

          // Notificar al emisor original que sus mensajes fueron leídos
          io.to(`conversacion:${data.conversacionId}`).emit("mensajes_leidos", {
            conversacionId: data.conversacionId,
            leidoPor: userId,
          });
        } catch (err) {
          console.error("[Socket] Error al marcar leído:", err);
        }
      }
    );

    // =============================================
    // EVENTO: Typing indicator (escribiendo...)
    // =============================================
    socket.on(
      "typing",
      (data: { conversacionId: string; estaEscribiendo: boolean }) => {
        // Notificar a los demás en la conversación que este usuario está escribiendo
        socket.to(`conversacion:${data.conversacionId}`).emit("user_typing", {
          userId,
          conversacionId: data.conversacionId,
          estaEscribiendo: data.estaEscribiendo,
        });
      }
    );

    // =============================================
    // DESCONECTAR
    // =============================================
    socket.on("disconnect", () => {
      // Remover el socket del mapa de conectados
      const sockets = usuariosConectados.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          usuariosConectados.delete(userId);
        }
      }

      console.log(`[Socket] Usuario ${userId} desconectado (socket: ${socket.id})`);
    });
  });

  // =============================================
  // SCHEDULER: renovación automática de suscripciones vencidas
  // =============================================
  // Antes, renovarSuscripcionesVencidas() (ex verificar-vencidas) sólo se
  // ejecutaba si alguien pegaba manualmente a la ruta HTTP protegida por
  // ADMIN — sin un cron externo configurado, en la práctica nunca corría
  // sola. Como este mismo proceso Node ya está arriba mientras la app
  // vive (server custom, no serverless) y ya importa prisma, la corremos
  // acá adentro directamente: una vez al arrancar (con un delay corto,
  // para no competir con el resto del startup) y después cada 24hs. Es
  // idempotente, así que un doble disparo o un reinicio del proceso no
  // rompen nada. Esto no reemplaza el webhook real de MercadoPago
  // (subscription_authorized_payment) para las suscripciones con
  // preapproval — sigue siendo solo para el caso legado sin preapproval.
  const UN_DIA_MS = 24 * 60 * 60 * 1000;

  async function correrVerificacionVencidas() {
    try {
      const renovadas = await renovarSuscripcionesVencidas();
      if (renovadas.length > 0) {
        console.log(
          `[Scheduler] Suscripciones renovadas automáticamente: ${renovadas.length}`
        );
      }
    } catch (err) {
      console.error("[Scheduler] Error verificando suscripciones vencidas:", err);
    }
  }

  setTimeout(correrVerificacionVencidas, 30_000);
  setInterval(correrVerificacionVencidas, UN_DIA_MS);

  // Iniciar el servidor HTTP
  httpServer.listen(port, () => {
    console.log(`> fixhub listo en http://${hostname}:${port}`);
    console.log(`> Modo: ${dev ? "desarrollo" : "producción"}`);
    console.log(`> Socket.io disponible en http://${hostname}:${port}/api/socketio`);
    console.log(`> Scheduler: verificación de suscripciones vencidas cada 24hs`);
  });
});
