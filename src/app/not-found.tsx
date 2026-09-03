import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 text-6xl">🔍</div>
      <h1 className="mb-2 text-3xl font-bold text-navy">Página no encontrada</h1>
      <p className="mb-6 max-w-md text-text-light">
        Lo sentimos, la página que buscás no existe o fue movida a otra ubicación.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
