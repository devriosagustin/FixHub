/**
 * rate-limit.ts - Rate limiting simple en memoria, por IP + acción.
 *
 * No hay ninguna dependencia externa (nada de Redis/Upstash) a
 * propósito: alcanza para el estado actual del deploy (un solo proceso
 * Node, ver AGENTS.md "Hosting / despliegue" -- server.ts corre
 * persistente, no serverless). Si en algún momento se escala a más de
 * una instancia, este límite deja de ser compartido entre instancias
 * (cada una cuenta por separado) -- en ese momento hay que mover esto a
 * un store compartido (Redis, ya se menciona para el adapter de
 * Socket.io en el mismo escenario de escalado).
 *
 * Uso:
 *   const limite = rateLimit(`register:${ip}`, { maxIntentos: 5, ventanaMs: 60_000 });
 *   if (!limite.permitido) {
 *     return NextResponse.json({ error: "Demasiados intentos, esperá un momento" }, { status: 429 });
 *   }
 */

type Bucket = { cuenta: number; reiniciaEn: number };

const buckets = new Map<string, Bucket>();

// Limpieza periódica para no acumular entradas de IPs viejas para
// siempre en memoria. No hace falta ser preciso, alcanza con no crecer
// sin límite.
const LIMPIEZA_INTERVALO_MS = 5 * 60 * 1000;
setInterval(() => {
  const ahora = Date.now();
  for (const [clave, bucket] of buckets) {
    if (bucket.reiniciaEn < ahora) buckets.delete(clave);
  }
}, LIMPIEZA_INTERVALO_MS).unref();

export function rateLimit(
  clave: string,
  { maxIntentos, ventanaMs }: { maxIntentos: number; ventanaMs: number }
): { permitido: boolean; restantes: number } {
  const ahora = Date.now();
  const bucket = buckets.get(clave);

  if (!bucket || bucket.reiniciaEn < ahora) {
    buckets.set(clave, { cuenta: 1, reiniciaEn: ahora + ventanaMs });
    return { permitido: true, restantes: maxIntentos - 1 };
  }

  if (bucket.cuenta >= maxIntentos) {
    return { permitido: false, restantes: 0 };
  }

  bucket.cuenta++;
  return { permitido: true, restantes: maxIntentos - bucket.cuenta };
}

/**
 * IP del caller a partir de los headers que reenvía el reverse proxy
 * (Caddy, o el proxy del proveedor de hosting). Sin proxy delante (dev
 * local), esos headers no están, así que cae a "unknown" -- ahí el
 * rate limit efectivamente agrupa a todos los callers locales bajo una
 * sola clave, lo cual está bien para desarrollo pero es la razón por la
 * que esto NO reemplaza un reverse proxy/WAF real en producción con
 * tráfico hostil de verdad.
 */
export function obtenerIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
