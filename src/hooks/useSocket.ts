/**
 * Hook: useSocket
 * 
 * Conecta al servidor Socket.io y maneja la conexión/desconexión.
 * Se usa dentro del ChatProvider para compartir la instancia del socket.
 * 
 * Retorna el socket de Socket.io o null si no está conectado.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// URL del servidor Socket.io (mismo origen, path custom)
const SOCKET_URL = typeof window !== "undefined" ? window.location.origin : "";
const SOCKET_PATH = "/api/socketio";

export function useSocket() {
  // Referencia al socket para no recrearlo en cada render
  const socketRef = useRef<Socket | null>(null);
  // Estado de conexión
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    // Crear conexión al socket
    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      // Enviar cookies para autenticación
      withCredentials: true,
      // Transporte: intentar websocket primero
      transports: ["websocket", "polling"],
      // Reconexión automática
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Eventos de conexión
    socket.on("connect", () => {
      console.log("[Socket] Conectado:", socket.id);
      setConectado(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Desconectado:", reason);
      setConectado(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Error de conexión:", err.message);
    });

    // Limpiar al desmontar el componente
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    socket: socketRef.current,
    conectado,
  };
}
