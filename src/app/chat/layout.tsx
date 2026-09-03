/**
 * Layout de la página de Chat
 * 
 * Envuelve la página con ChatProvider para tener acceso
 * al contexto del chat (conversaciones, mensajes, socket, etc.)
 */

"use client";

import { ChatProvider } from "@/contexts/ChatContext";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatProvider>{children}</ChatProvider>;
}
