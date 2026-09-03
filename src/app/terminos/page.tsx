import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | fixhub",
  description: "Términos y condiciones de uso de la plataforma fixhub.",
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-navy">Términos y Condiciones</h1>
      <p className="mb-4 text-sm text-text-light">Última actualización: septiembre 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-text">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">1. Aceptación</h2>
          <p>Al acceder y utilizar fixhub, usted acepta estos Términos y Condiciones. Si no está de acuerdo, no utilice la plataforma.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">2. Descripción del servicio</h2>
          <p>fixhub es una plataforma que conecta clientes con profesionales verificados (electricistas, plomeros, albañiles, entre otros). La plataforma facilita la búsqueda, contacto y gestión de reseñas, pero no es parte del contrato entre el cliente y el profesional.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">3. Registro</h2>
          <p>Para acceder a ciertas funciones, debe crear una cuenta proporcionando información veraz y actualizada. Usted es responsable de mantener la confidencialidad de sus credenciales.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">4. Profesionales</h2>
          <p>Los profesionales que se registran en la plataforma deben presentar documentación válida (DNI) para verificación. fixhub realiza una revisión inicial, pero no garantiza la calidad del servicio prestado por cada profesional.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">5. Reseñas</h2>
          <p>Los clientes pueden dejar reseñas sobre profesionales. Las reseñas deben ser basadas en experiencias reales. fixhub se reserva el derecho de eliminar reseñas que violen estos términos.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">6. Suscripciones y pagos</h2>
          <p>Los profesionales pueden adquirir planes de suscripción para mejorar su visibilidad en la plataforma. Los pagos se procesan a través de Mercado Pago. fixhub no almacena datos de tarjetas de crédito.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">7. Limitación de responsabilidad</h2>
          <p>fixhub actúa como intermediario. No somos responsables por la calidad del servicio, daños, perjuicios o disputas entre clientes y profesionales. El usuario utiliza la plataforma bajo su propia responsabilidad.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">8. Modificaciones</h2>
          <p>fixhub se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones serán efectivas desde su publicación en esta página.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">9. Contacto</h2>
          <p>Para consultas sobre estos términos, contactanos a través de nuestra <a href="/contacto" className="text-orange hover:underline">página de contacto</a>.</p>
        </section>
      </div>
    </div>
  );
}
