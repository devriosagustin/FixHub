import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profesional no disponible | fixhub",
};

export default function PerfilNoDisponiblePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 text-6xl">🙁</div>
      <h1 className="mb-2 text-3xl font-bold text-navy">
        Este profesional no está disponible
      </h1>
      <p className="mb-6 max-w-md text-text-light">
        Este perfil no se encuentra activo actualmente, por lo que no es
        posible contactarlo desde fixhub. Te sugerimos buscar otro
        profesional disponible para tu proyecto.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/busqueda"
          className="rounded-xl bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark"
        >
          Buscar profesionales
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-navy transition-colors hover:bg-gray-50"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
