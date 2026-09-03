"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar el correo");
      } else {
        setEnviado(true);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy font-bold text-white text-lg">
              CY
            </div>
            <h1 className="mt-4 text-2xl font-bold text-navy">Restablecer contraseña</h1>
            <p className="mt-2 text-sm text-text-light">
              Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {enviado ? (
            <div className="rounded-lg bg-success/10 p-6 text-center">
              <MailCheck className="mx-auto h-10 w-10 text-success" />
              <p className="mt-3 font-medium text-success">Revisá tu email</p>
              <p className="mt-1 text-sm text-text-light">
                Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
              </p>
              <Link href="/login" className="mt-4 inline-block text-sm text-orange hover:underline">
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg bg-error/10 p-3 text-sm text-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full rounded-lg bg-navy py-3 font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-50"
                >
                  {cargando ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>

              <Link
                href="/login"
                className="mt-4 flex items-center justify-center gap-1 text-sm text-text-light hover:text-text"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
