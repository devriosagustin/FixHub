/**
 * ChatInput - Input para enviar mensajes
 *
 * Componente de entrada de texto con:
 * - Textarea auto-expandible
 * - Botón de envío
 * - Adjuntos de archivos/imágenes (sube a /api/chat/upload y envía URL)
 * - Soporte para enviar con Enter (Shift+Enter para nueva línea)
 * - Indicador de typing (debounced)
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Loader2, X, FileText } from "lucide-react";

/** Datos de un adjunto a enviar */
export interface AdjuntoSeleccionado {
  url: string;
  tipo: string;
  nombre: string;
}

interface ChatInputProps {
  /** Callback al enviar un mensaje (contenido y/o adjunto) */
  onEnviar: (
    contenido: string,
    adjunto?: AdjuntoSeleccionado
  ) => void;
  /** Callback para indicar typing (true = escribiendo, false = dejó de escribir) */
  onTyping: (escribiendo: boolean) => void;
  /** Placeholder del input */
  placeholder?: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export function ChatInput({
  onEnviar,
  onTyping,
  placeholder = "Escribí tu mensaje...",
}: ChatInputProps) {
  const [texto, setTexto] = useState("");
  const [adjunto, setAdjunto] = useState<AdjuntoSeleccionado | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Timer para debounce del typing indicator
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================
  // AUTO-EXPANDIR EL TEXTAREA
  // =============================================
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Resetear la altura para calcular el scrollHeight correcto
    textarea.style.height = "auto";
    // Limitar a un máximo de 5 líneas
    const maxHeight = 120;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [texto]);

  // =============================================
  // MANEJO DEL TYPING INDICATOR (debounced)
  // =============================================
  const handleTypingStart = useCallback(() => {
    onTyping(true);

    // Cancelar el timer anterior si existe
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Después de 2 segundos de inactividad, dejar de mostrar "escribiendo"
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  }, [onTyping]);

  // Limpiar el timer al desmontar
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  // =============================================
  // SUBIR ADJUNTO
  // =============================================
  const handleSeleccionarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_SIZE) {
      alert("El archivo no puede superar los 10 MB");
      return;
    }
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      alert("Formato no permitido. Usá JPG, PNG, WebP, GIF o PDF.");
      return;
    }

    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al subir el archivo");
        return;
      }
      setAdjunto(data.adjunto as AdjuntoSeleccionado);
    } catch {
      alert("Error de conexión al subir el archivo");
    } finally {
      setSubiendo(false);
    }
  };

  // =============================================
  // ENVIAR MENSAJE
  // =============================================
  const handleEnviar = useCallback(() => {
    const contenido = texto.trim();
    if (!contenido && !adjunto) return;

    onEnviar(contenido, adjunto ?? undefined);
    setTexto("");
    setAdjunto(null);

    // Cancelar typing indicator
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    onTyping(false);

    // Resetear altura del textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [texto, adjunto, onEnviar, onTyping]);

  // =============================================
  // MANEJO DE TECLAS
  // =============================================
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sin Shift: enviar mensaje
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  // =============================================
  // MANEJO DE CAMBIOS EN EL INPUT
  // =============================================
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTexto(e.target.value);
    handleTypingStart();
  };

  return (
    <div className="p-3 border-t border-border bg-card">
      {/* Preview del adjunto seleccionado */}
      {adjunto && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          {adjunto.tipo.startsWith("image/") ? (
            <img src={adjunto.url} alt={adjunto.nombre} className="h-10 w-10 rounded object-cover" />
          ) : (
            <FileText className="h-8 w-8 text-navy-light" />
          )}
          <span className="flex-1 truncate text-sm text-text">{adjunto.nombre}</span>
          <button
            onClick={() => setAdjunto(null)}
            className="text-text-light hover:text-error transition-colors"
            title="Quitar adjunto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Botón adjuntar archivo */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendo}
          className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-surface text-text-light hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50"
          title="Adjuntar archivo"
        >
          {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={handleSeleccionarArchivo}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none bg-surface rounded-xl border border-border px-4 py-2.5 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-navy-light transition-colors max-h-[120px] overflow-y-auto"
        />

        {/* Botón enviar */}
        <button
          onClick={handleEnviar}
          disabled={!texto.trim() && !adjunto}
          className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
            texto.trim() || adjunto
              ? "bg-orange hover:bg-orange-dark text-white shadow-md"
              : "bg-surface text-text-light cursor-not-allowed"
          }`}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
