import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-navy-dark text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Branding */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange font-bold text-white text-sm">
                FH
              </div>
              <span className="text-lg font-bold text-white">
                fix<span className="text-orange">hub</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed">
              Conectamos clientes con profesionales verificados de confianza.
            </p>
          </div>

          {/* Para clientes */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              Para clientes
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/busqueda" className="transition-colors hover:text-white">
                  Buscar profesionales
                </Link>
              </li>
              <li>
                <Link href="/busqueda?oficio=electricista" className="transition-colors hover:text-white">
                  Electricistas
                </Link>
              </li>
              <li>
                <Link href="/busqueda?oficio=plomero" className="transition-colors hover:text-white">
                  Plomeros
                </Link>
              </li>
              <li>
                <Link href="/busqueda?oficio=albanil" className="transition-colors hover:text-white">
                  Albañiles
                </Link>
              </li>
            </ul>
          </div>

          {/* Para profesionales */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              Para profesionales
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/profesional/registro" className="transition-colors hover:text-white">
                  Crear perfil
                </Link>
              </li>
              <li>
                <Link href="/planes" className="transition-colors hover:text-white">
                  Planes y precios
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              Empresa
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terminos" className="transition-colors hover:text-white">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="transition-colors hover:text-white">
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="transition-colors hover:text-white">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} fixhub. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
