"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface ResenaAdmin {
  id: string;
  puntuacion: number;
  comentario: string;
  fotoUrl: string | null;
  aprobada: boolean;
  motivoRechazo: string | null;
  createdAt: string;
  perfil: {
    titulo: string;
    usuario: { nombre: string };
  };
  cliente: { nombre: string; imagen: string | null };
}

function Estrellas({ cantidad }: { cantidad: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= cantidad ? "fill-orange text-orange" : "text-border"}`}
        />
      ))}
    </div>
  );
}

export default function AdminResenasPage() {
  const [resenas, setResenas] = useState<ResenaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [moderando, setModerando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"pendientes" | "aprobadas" | "rechazadas">("pendientes");

  const cargarResenas = async () => {
    const res = await fetch("/api/admin/resenas?limit=100");
    const data = await res.json();
    setResenas(data.resenas || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarResenas();
  }, []);

  const eliminarResena = async (id: string) => {
    if (!confirm("¿Eliminar esta reseña permanentemente?")) return;

    setEliminando(id);
    try {
      await fetch(`/api/admin/resenas?id=${id}`, { method: "DELETE" });
      await cargarResenas();
    } catch {
      alert("Error al eliminar la reseña");
    } finally {
      setEliminando(null);
    }
  };

  const moderarResena = async (id: string, aprobar: boolean) => {
    let motivoRechazo: string | null = null;
    if (!aprobar) {
      motivoRechazo = window.prompt("Motivo del rechazo (visible para el usuario):");
      if (motivoRechazo === null) return; // canceló
      if (!motivoRechazo.trim()) motivoRechazo = "La reseña fue rechazada por moderación.";
    }

    setModerando(id);
    try {
      const res = await fetch("/api/admin/resenas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, aprobar, motivoRechazo }),
      });
      if (res.ok) {
        await cargarResenas();
      } else {
        const err = await res.json();
        alert(err.error || "Error al moderar la reseña");
      }
    } catch {
      alert("Error al moderar la reseña");
    } finally {
      setModerando(null);
    }
  };

  const resenasFiltradas = resenas.filter((r) => {
    if (filtro === "aprobadas") return r.aprobada;
    if (filtro === "rechazadas") return !r.aprobada;
    return !r.aprobada && !r.motivoRechazo; // pendientes de revisión
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Moderar reseñas</h1>

        <div className="flex gap-2">
          {(
            [
              ["pendientes", "Pendientes"],
              ["aprobadas", "Aprobadas"],
              ["rechazadas", "Rechazadas"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filtro === key
                  ? "bg-navy text-white"
                  : "bg-surface text-text-light hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        </div>
      ) : resenasFiltradas.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-text-light">
          No hay reseñas en esta categoría.
        </div>
      ) : (
        <div className="space-y-4">
          {resenasFiltradas.map((r) => (
            <div key={r.id} className={`rounded-xl border bg-card p-5 ${!r.aprobada ? "border-warning/40" : "border-border"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-navy">{r.cliente.nombre}</span>
                    <Estrellas cantidad={r.puntuacion} />
                    <span className="text-xs text-text-light">
                      {new Date(r.createdAt).toLocaleDateString("es-AR")}
                    </span>
                    {!r.aprobada && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.motivoRechazo ? "bg-error/10 text-error" : "bg-warning/10 text-warning"
                        }`}
                      >
                        {r.motivoRechazo ? "Rechazada" : "Pendiente"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text-light">
                    → {r.perfil.usuario.nombre} ({r.perfil.titulo})
                  </p>
                  <p className="mt-2 text-sm text-text">{r.comentario}</p>
                  {r.fotoUrl && (
                    <a
                      href={r.fotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-orange hover:underline"
                    >
                      Ver foto adjunta
                    </a>
                  )}
                  {r.motivoRechazo && (
                    <p className="mt-2 rounded-lg bg-error/5 p-2 text-xs text-error">
                      Motivo: {r.motivoRechazo}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:w-32">
                  {!r.aprobada && (
                    <button
                      onClick={() => moderarResena(r.id, true)}
                      disabled={moderando === r.id}
                      className="rounded-lg border border-success/30 bg-success/5 px-4 py-2 text-sm font-medium text-success transition-colors hover:bg-success/10 disabled:opacity-50"
                    >
                      {moderando === r.id ? "..." : "Aprobar"}
                    </button>
                  )}
                  {r.aprobada && (
                    <button
                      onClick={() => moderarResena(r.id, false)}
                      disabled={moderando === r.id}
                      className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
                    >
                      {moderando === r.id ? "..." : "Rechazar"}
                    </button>
                  )}
                  <button
                    onClick={() => eliminarResena(r.id)}
                    disabled={eliminando === r.id}
                    className="rounded-lg border border-error/30 bg-error/5 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                  >
                    {eliminando === r.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
