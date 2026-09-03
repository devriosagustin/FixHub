import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | fixhub",
  description: "Política de privacidad y tratamiento de datos personales de fixhub.",
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-navy">Política de Privacidad</h1>
      <p className="mb-4 text-sm text-text-light">Última actualización: septiembre 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-text">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">1. Datos que recopilamos</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Nombre, email e imagen de perfil</li>
            <li>Información profesional (título, oficios, experiencia, ubicación)</li>
            <li>Documentación de verificación (DNI)</li>
            <li>Fotos de trabajos y certificaciones</li>
            <li>Reseñas y calificaciones</li>
            <li>Datos de pago (procesados por Mercado Pago, no almacenados por nosotros)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">2. Uso de los datos</h2>
          <p>Utilizamos sus datos para:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Facilitar la conexión entre clientes y profesionales</li>
            <li>Verificar la identidad de los profesionales</li>
            <li>Mejorar la experiencia en la plataforma</li>
            <li>Enviar notificaciones relevantes sobre la actividad en su cuenta</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">3. Compartición de datos</h2>
          <p>Su información pública (nombre, foto, profesional, reseñas) es visible para otros usuarios. No compartimos datos personales con terceros para fines de marketing. Podemos compartir datos cuando:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Lo requiera la ley</li>
            <li>Sea necesario para procesar pagos (con Mercado Pago)</li>
            <li>Para verificar documentos de profesional (almacenados en Cloudinary)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">4. Seguridad</h2>
          <p>Implementamos medidas de seguridad para proteger sus datos, incluyendo cifrado de contraseñas y conexiones HTTPS. Sin embargo, ningún sistema es 100% seguro.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">5. Sus derechos</h2>
          <p>Usted puede:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Solicitar acceso a sus datos personales</li>
            <li>Solicitar la corrección de datos inexactos</li>
            <li>Solicitar la eliminación de su cuenta y datos</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">6. Cookies</h2>
          <p>Utilizamos cookies esenciales para el funcionamiento de la plataforma (autenticación, preferencias). No utilizamos cookies de rastreo de terceros.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-navy">7. Contacto</h2>
          <p>Para ejercer sus derechos o hacer consultas, contactanos a través de nuestra <a href="/contacto" className="text-orange hover:underline">página de contacto</a>.</p>
        </section>
      </div>
    </div>
  );
}
