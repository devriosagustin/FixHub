"use client";

import { useEffect, useState } from "react";

interface ProfesionalAdmin {
  id: string;
  titulo: string;
  estado: string;
  verificado: boolean;
  ciudad: string;
  createdAt: string;
  usuario: { id: string; nombre: string; email: string; imagen: string | null };
  oficios: { oficio: { nombre: string; icono: string } }[];
  documentos: { tipo: string; url: string; estado: string }[];
}

const estadoColors: Record<string, string> = {
  PENDIENTE: "bg-warning/10 text-warning",
  APROBADO: "bg-success/10 text-success",
  RECHAZADO: "bg-error/10 text-error",
  SUSPENDIDO: "bg-text-light/10 text-text-light",
};

export default function AdminProfesionalesPage() {
  const [profesionales, setProfesionales] = useState<ProfesionalAdmin[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState<string | null>(null);

  const cargarProfesionales = async (estado?: string) => {
    setCargando(true);
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);

    const res = await fetch(`/api/admin/profesionales?${params}`);
    const data = await res.json();
    setProfesionales(data.profesionales || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarProfesionales(filtroEstado);
  }, [filtroEstado]);

  const manejarAccion = async (id: string, accion: "aprobar" | "rechazar" | "suspender") => {
    if (!confirm(`¿Confirmar ${accion} a este profesional?`)) return;

    setAccionando(id);
    try {
      await fetch(`/api/admin/profesionales/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      await cargarProfesionales(filtroEstado);
    } catch {
      alert("Error al procesar la acción");
    } finally {
      setAccionando(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Gestionar profesionales</h1>

        {/* Filtros */}
        <div className="flex gap-2">
          {["", "PENDIENTE", "APROBADO", "RECHAZADO", "SUSPENDIDO"].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroEstado === estado
                  ? "bg-navy text-white"
                  : "border border-border bg-card text-text-light hover:border-navy/30"
              }`}
            >
              {estado || "Todos"}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        </div>
      ) : profesionales.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-text-light">
          No se encontraron profesionales con este filtro.
        </div>
      ) : (
        <div className="space-y-4">
          {profesionales.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-navy">{p.usuario.nombre}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoColors[p.estado] || ""}`}>
                      {p.estado}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-light">{p.usuario.email}</p>
                  <p className="mt-1 font-medium text-text">{p.titulo}</p>
                  <p className="mt-1 text-sm text-text-light">
                    {p.oficios.map((o) => `${o.oficio.icono} ${o.oficio.nombre}`).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-text-light">
                    Ciudad: {p.ciudad || "No especificada"} · Registrado:{" "}
                    {new Date(p.createdAt).toLocaleDateString("es-AR")}
                  </p>

                  {/* Documentos DNI */}
                  {p.documentos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-text-light">Documentos DNI:</p>
                      <div className="mt-1 flex gap-2">
                        {p.documentos.map((doc, i) => (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border border-border px-2 py-1 text-xs text-orange hover:bg-orange/5"
                          >
                            {doc.tipo === "dni_frente" ? "DNI Frente" : "DNI Dorso"} ({doc.estado})
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                {p.estado === "PENDIENTE" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => manejarAccion(p.id, "aprobar")}
                      disabled={accionando === p.id}
                      className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90 disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => manejarAccion(p.id, "rechazar")}
                      disabled={accionando === p.id}
                      className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                )}

                {p.estado === "APROBADO" && (
                  <button
                    onClick={() => manejarAccion(p.id, "suspender")}
                    disabled={accionando === p.id}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-light transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    Suspender
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
