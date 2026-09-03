"use client";

import { useEffect, useState } from "react";
import { Users, Shield, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  imagen: string | null;
  rol: string;
  createdAt: string;
  perfilProfesional: {
    id: string;
    estado: string;
    verificado: boolean;
    ciudad: string | null;
    oficios: { oficio: { nombre: string } }[];
  } | null;
  _count: { resenasCreadas: number; mensajesEnviados: number };
}

const rolColors: Record<string, string> = {
  ADMIN: "bg-error/10 text-error",
  PROFESIONAL: "bg-orange/10 text-orange",
  CLIENTE: "bg-navy/10 text-navy",
};

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtroRol, setFiltroRol] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [cambiandoRol, setCambiandoRol] = useState<string | null>(null);

  const cargarUsuarios = async () => {
    setCargando(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filtroRol) params.set("rol", filtroRol);
    if (busqueda) params.set("busqueda", busqueda);

    const res = await fetch(`/api/admin/usuarios?${params}`);
    const data = await res.json();
    setUsuarios(data.usuarios || []);
    setTotalPages(data.pagination?.totalPages || 1);
    setCargando(false);
  };

  useEffect(() => { cargarUsuarios(); }, [page, filtroRol, busqueda]);

  const buscar = () => {
    setPage(1);
    setBusqueda(busquedaInput);
  };

  const cambiarRol = async (userId: string, nuevoRol: string) => {
    if (!confirm(`¿Cambiar rol a ${nuevoRol}?`)) return;
    setCambiandoRol(userId);
    try {
      await fetch("/api/admin/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rol: nuevoRol }),
      });
      cargarUsuarios();
    } finally {
      setCambiandoRol(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Usuarios</h1>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <select
            value={filtroRol}
            onChange={(e) => { setFiltroRol(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Todos los roles</option>
            <option value="CLIENTE">Clientes</option>
            <option value="PROFESIONAL">Profesionales</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            type="text"
            value={busquedaInput}
            onChange={(e) => setBusquedaInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="Buscar por nombre o email..."
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button onClick={buscar} className="rounded-lg bg-navy px-3 py-2 text-white hover:bg-navy-light">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left font-semibold text-navy">Usuario</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Perfil</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Registro</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-light">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-light">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.imagen ? (
                        <img src={u.imagen} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                          {u.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-text">{u.nombre}</p>
                        <p className="text-xs text-text-light">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${rolColors[u.rol] || ""}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.perfilProfesional ? (
                      <div>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.perfilProfesional.estado === "APROBADO" ? "bg-success/10 text-success" :
                          u.perfilProfesional.estado === "PENDIENTE" ? "bg-warning/10 text-warning" :
                          "bg-text-light/10 text-text-light"
                        }`}>
                          {u.perfilProfesional.estado}
                        </span>
                        <p className="mt-0.5 text-xs text-text-light">
                          {u.perfilProfesional.oficios.map(o => o.oficio.nombre).join(", ")}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-text-light">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-light">
                    {new Date(u.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    {u.rol !== "ADMIN" && (
                      <select
                        value={u.rol}
                        onChange={(e) => cambiarRol(u.id, e.target.value)}
                        disabled={cambiandoRol === u.id}
                        className="rounded border border-border bg-card px-2 py-1 text-xs"
                      >
                        <option value="CLIENTE">Cliente</option>
                        <option value="PROFESIONAL">Profesional</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border p-2 hover:bg-surface disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-text-light">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border p-2 hover:bg-surface disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
