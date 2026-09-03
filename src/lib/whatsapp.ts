/**
 * whatsapp.ts - Utilidad para normalizar números de teléfono al formato
 * internacional requerido por los enlaces `https://wa.me/<número>`.
 *
 * WhatsApp usa formato internacional SIN el símbolo + y sin espacios,
 * guiones ni paréntesis (E.164 simplificado).
 *
 * La app opera principalmente en Argentina, así que por defecto se asume
 * el código de país 54. Acepta tanto números locales como internacionales.
 */

const CODIGO_PAIS_DEFECTO = "54";

/** Quita todo lo que no sea dígito. */
function soloDigitos(valor: string): string {
  return (valor || "").replace(/\D/g, "");
}

/**
 * Normaliza un número de teléfono a formato E.164 (sin el símbolo +)
 * listo para usar en `https://wa.me/<resultado>`.
 *
 * Ejemplos:
 *   "011 4444-5555"          -> "541144445555"
 *   "+54 11 4444 5555"       -> "541144445555"
 *   "5491144445555"          -> "5491144445555"
 *   "1144445555"             -> "541144445555"
 */
export function normalizarWhatsApp(numero: string | null | undefined): string {
  if (!numero) return "";
  const digitos = soloDigitos(numero);
  if (digitos.length < 8) return digitos;

  // Ya tiene el código de país argentino (54) prefijado.
  if (digitos.startsWith("54")) {
    return digitos;
  }

  // Comienza con 0 -> reemplazar el 0 por el código de país.
  if (digitos.startsWith("0")) {
    return CODIGO_PAIS_DEFECTO + digitos.slice(1);
  }

  // Número local sin código de país -> anteponer el código de país.
  return CODIGO_PAIS_DEFECTO + digitos;
}

/** Retorna la URL wa.me para un número, o null si no hay número. */
export function urlWhatsApp(
  numero: string | null | undefined,
  texto?: string
): string | null {
  const normalizado = normalizarWhatsApp(numero);
  if (!normalizado) return null;
  const base = `https://wa.me/${normalizado}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
