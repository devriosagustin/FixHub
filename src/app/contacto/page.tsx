"use client";

import { useState } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";

export default function ContactoPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, asunto, mensaje }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Error al enviar el mensaje");
      } else {
        setEnviado(true);
        setNombre("");
        setEmail("");
        setAsunto("");
        setMensaje("");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-navy">Contacto</h1>
      <p className="mb-8 text-text-light">
        ¿Tenés alguna pregunta o consulta? Escribinos y te responderemos a la brevedad.
      </p>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Info de contacto */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-orange" />
            <div>
              <p className="text-sm font-medium text-text">Email</p>
              <p className="text-sm text-text-light">soporte@fixhub.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-orange" />
            <div>
              <p className="text-sm font-medium text-text">Soporte</p>
              <p className="text-sm text-text-light">Lun - Vie, 9:00 - 18:00</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="md:col-span-2">
          {enviado ? (
            <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center">
              <p className="font-medium text-success">¡Mensaje enviado!</p>
              <p className="mt-1 text-sm text-text-light">
                Te responderemos lo antes posible.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Nombre</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Asunto</label>
                <input
                  type="text"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Mensaje</label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  required
                  rows={5}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange"
                />
              </div>
              <button
                type="submit"
                disabled={cargando}
                className="flex items-center gap-2 rounded-lg bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {cargando ? "Enviando..." : "Enviar mensaje"}
              </button>

              {error && (
                <p className="text-sm text-error">{error}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
