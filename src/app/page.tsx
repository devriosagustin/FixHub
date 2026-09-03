import Link from "next/link";
import { Search, Shield, Star, MessageCircle, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "fixhub - Encuentra profesionales de confianza cerca tuyo",
  description:
    "Conectá con electricistas, plomeros, albañiles, carpinteros, pintores y más. Profesionales verificados con reseñas de clientes reales.",
  openGraph: {
    title: "fixhub - Profesionales de confianza",
    description: "Encontrá al profesional ideal cerca tuyo. Verificados y con reseñas.",
  },
};

// Datos mock de oficios para la landing
const oficios = [
  { nombre: "Electricista", slug: "electricista", icono: "⚡", descripcion: "Instalaciones, reparaciones y mantenimiento eléctrico" },
  { nombre: "Plomero", slug: "plomero", icono: "🔧", descripcion: "Reparación de cañerías, grifería y gas" },
  { nombre: "Albañil", slug: "albanil", icono: "🧱", descripcion: "Construcción, remodelación y acabados" },
  { nombre: "Carpintero", slug: "carpintero", icono: "🪚", descripcion: "Muebles, puertas, ventanas y estructuras de madera" },
  { nombre: "Pintor", slug: "pintor", icono: "🎨", descripcion: "Pintura interior y exterior, decoración" },
  { nombre: "Cerrajero", slug: "cerrajero", icono: "🔐", descripcion: "Apertura, cambio de cerraduras y seguridad" },
  { nombre: "Jardinero", slug: "jardinero", icono: "🌿", descripcion: "Mantenimiento de jardines y paisajismo" },
  { nombre: "Gasista", slug: "gasista", icono: "🔥", descripcion: "Instalación y reparación de gas" },
];

const features = [
  {
    icon: Shield,
    titulo: "Profesionales verificados",
    descripcion: "Cada profesional pasa por un proceso de verificación de identidad (DNI) antes de aparecer en la plataforma.",
  },
  {
    icon: Star,
    titulo: "Reseñas reales",
    descripcion: "Lee opiniones de clientes que ya contrataron el servicio. Solo clientes verificados pueden dejar reseñas.",
  },
  {
    icon: MessageCircle,
    titulo: "Chat en tiempo real",
    descripcion: "Comunícate directamente con el profesional antes de contratar. Consultas, presupuestos y coordinación.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* =============================================
          HERO SECTION
          ============================================= */}
      <section className="relative overflow-hidden bg-navy py-20 sm:py-28">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Encontrá al profesional
              <br />
              <span className="text-orange">ideal para tu hogar</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70 sm:text-xl">
              Conectamos personas con profesionales verificados y de confianza.
              Electricistas, plomeros, albañiles y mucho más.
            </p>

            {/* Barra de búsqueda */}
            <div className="mx-auto mt-10 max-w-2xl">
              <Link href="/busqueda" className="block">
                <div className="flex items-center rounded-xl bg-white p-2 shadow-2xl transition-shadow hover:shadow-3xl">
                  <Search className="ml-3 h-5 w-5 text-text-light" />
                  <input
                    type="text"
                    placeholder="¿Qué servicio necesitás? (ej: electricista, plomero...)"
                    className="flex-1 border-0 bg-transparent px-4 py-3 text-text outline-none placeholder:text-text-light"
                    readOnly
                  />
                  <button className="rounded-lg bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark">
                    Buscar
                  </button>
                </div>
              </Link>
            </div>

            {/* Oficios populares */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-white/50">Populares:</span>
              {["Electricista", "Plomero", "Albañil", "Pintor"].map((oficio) => (
                <Link
                  key={oficio}
                  href={`/busqueda?oficio=${oficio.toLowerCase()}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
                >
                  {oficio}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =============================================
          OFICIOS
          ============================================= */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">
            ¿Qué oficio necesitás?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-text-light">
            Explorá nuestra categoría de profesionales disponibles en tu zona.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {oficios.map((oficio) => (
              <Link
                key={oficio.slug}
                href={`/busqueda?oficio=${oficio.slug}`}
                className="group rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-orange hover:shadow-lg"
              >
                <span className="text-3xl">{oficio.icono}</span>
                <h3 className="mt-3 font-semibold text-navy group-hover:text-orange">
                  {oficio.nombre}
                </h3>
                <p className="mt-1 text-xs text-text-light">{oficio.descripcion}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/busqueda"
              className="inline-flex items-center gap-1 text-sm font-semibold text-orange transition-colors hover:text-orange-dark"
            >
              Ver todos los oficios
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* =============================================
          CARACTERÍSTICAS
          ============================================= */}
      <section className="border-t border-border bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">
            ¿Por qué fixhub?
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.titulo} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange/10">
                  <feature.icon className="h-7 w-7 text-orange" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-navy">{feature.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">
                  {feature.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================
          CTA PROFESIONAL
          ============================================= */}
      <section className="bg-navy py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            ¿Sos profesional?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Creá tu perfil gratis, mostrá tus trabajos y llegá a miles de clientes
            que buscan tus servicios todos los días.
          </p>
          <Link
            href="/profesional/registro"
            className="mt-8 inline-flex items-center rounded-xl bg-orange px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-orange-dark"
          >
            Crear mi perfil profesional
            <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
