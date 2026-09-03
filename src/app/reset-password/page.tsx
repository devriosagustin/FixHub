"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al restablecer la contraseña");
      } else {
        setExito(data.mensaje);
        setTimeout(() => router.push("/login"), 2500);
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
            <h1 className="mt-4 text-2xl font-bold text-navy">Nueva contraseña</h1>
            <p className="mt-2 text-sm text-text-light">
              Elegí una nueva contraseña para tu cuenta.
            </p>
          </div>

          {exito && (
            <div className="mb-4 rounded-lg bg-success/10 p-4 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-success" />
              <p className="mt-2 text-sm font-medium text-success">{exito}</p>
              <p className="mt-1 text-xs text-text-light">Redirigiendo al inicio de sesión...</p>
            </div>
          )}

          {!token ? (
            <div className="rounded-lg bg-error/10 p-4 text-center text-sm text-error">
              El enlace es inválido. Solicitá uno nuevo.
              <Link href="/forgot-password" className="mt-2 block text-orange hover:underline">
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Nueva contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none focus:border-orange"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3 font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-50"
                >
                  {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {cargando ? "Guardando..." : "Guardar nueva contraseña"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-navy" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
