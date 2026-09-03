/**
 * Página principal de Chat
 * 
 * Layout de dos paneles:
 * - Izquierda: Lista de conversaciones
 * - Derecha: Mensajes de la conversación activa
 * 
 * En móvil: se muestra un panel a la vez con navegación entre ellos
 */

"use client";

import { useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { ConversacionesList } from "@/components/chat/ConversacionesList";
import { MensajesThread } from "@/components/chat/MensajesThread";

function ChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { conversacionActiva, setConversacionActiva, conectado, conversaciones } = useChat();

  // =============================================
  // AUTO-SELECCIONAR CONVERSACIÓN DESDE URL
  // =============================================
  useEffect(() => {
    const convId = searchParams.get("conversacion");
    if (convId) {
      setConversacionActiva(convId);
      // Limpiar el parámetro de la URL para no re-seleccionar al recargar
      window.history.replaceState({}, "", "/chat");
    }
  }, [searchParams, setConversacionActiva, conversaciones]);

  // =============================================
  // ESTADO DE CARGA DE SESIÓN
  // =============================================
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 text-navy animate-spin" />
      </div>
    );
  }

  // =============================================
  // NO AUTENTICADO
  // =============================================
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-center p-6">
        <MessageCircle className="h-16 w-16 text-text-light mb-4" />
        <h2 className="text-xl font-bold text-text mb-2">
          Iniciá sesión para chatear
        </h2>
        <p className="text-text-light mb-4">
          Necesitás tener una sesión activa para usar el chat
        </p>
        <button
          onClick={() => router.push("/login")}
          className="bg-orange hover:bg-orange-dark text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  // =============================================
  // CHAT LAYOUT (dos paneles)
  // =============================================
  return (
    <div className="flex h-[calc(100vh-64px)] bg-card">
      {/* Panel izquierdo: Conversaciones */}
      {/* En móvil: se oculta si hay conversación activa */}
      <div
        className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
          conversacionActiva ? "hidden md:flex" : "flex"
        } flex-col`}
      >
        <ConversacionesList />
      </div>

      {/* Panel derecho: Mensajes */}
      {/* En móvil: se oculta si NO hay conversación activa */}
      <div
        className={`flex-1 ${
          conversacionActiva ? "flex" : "hidden md:flex"
        } flex-col min-w-0`}
      >
        <MensajesThread />
      </div>

      {/* Indicador de conexión (solo debug, quitar en producción) */}
      {process.env.NODE_ENV === "development" && (
        <div
          className={`fixed bottom-2 right-2 text-xs px-2 py-1 rounded-full ${
            conectado
              ? "bg-success/20 text-success"
              : "bg-error/20 text-error"
          }`}
        >
          {conectado ? "● Conectado" : "○ Desconectado"}
        </div>
      )}
    </div>
  );
}

/**
 * Página de Chat envuelta en Suspense
 * (necesario porque useSearchParams requiere un Suspense boundary en Next.js 16)
 */
export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 text-navy animate-spin" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
