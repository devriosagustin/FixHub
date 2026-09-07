/**
 * API Route: POST /api/suscripcion/verificar-vencidas
 *
 * Detecta suscripciones vencidas con renovación automática activada
 * y las renueva automáticamente (extiende 1 mes, genera nuevo cobro).
 *
 * Este endpoint puede llamarse manualmente (como ADMIN) desde el panel o
 * una herramienta HTTP. El disparo automático y periódico corre aparte,
 * in-process en server.ts (ver renovarSuscripcionesVencidas() en
 * src/lib/suscripcion.ts, que ambos comparten) — no depende de que se
 * pegue a esta ruta, así que no hace falta configurar un cron externo.
 * Es idempotente.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { renovarSuscripcionesVencidas } from "@/lib/suscripcion";

export async function POST(_request: NextRequest) {
  try {
    const resultado = await requireAuth(["ADMIN"]);
    if (!resultado.ok) return resultado.response;

    const renovadas = await renovarSuscripcionesVencidas();

    return NextResponse.json({ renovadas: renovadas.length, detalles: renovadas });
  } catch (err) {
    return errorInterno(err, "verificando suscripciones vencidas");
  }
}
