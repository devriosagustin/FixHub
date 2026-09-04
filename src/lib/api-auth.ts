import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/**
 * Helper de autenticación/autorización para rutas de API.
 *
 * Reemplaza el bloque repetido en la mayoría de las rutas de /api:
 *   const session = await auth();
 *   if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
 *   if (session.user.rol !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
 *
 * Uso:
 *   const resultado = await requireAuth(["ADMIN"]);
 *   if (!resultado.ok) return resultado.response;
 *   const { session } = resultado;
 *
 * Sin roles (solo exige estar logueado): await requireAuth()
 */

// La sesión ya viene tipada con user.id/user.rol requeridos vía
// src/types/next-auth.d.ts (augmentación del módulo "next-auth").
type SesionAutenticada = Session;

type ResultadoAuth =
  | { ok: true; session: SesionAutenticada }
  | { ok: false; response: NextResponse };

export async function requireAuth(
  rolesPermitidos?: string[],
  mensajeRolInvalido = "No autorizado"
): Promise<ResultadoAuth> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  if (rolesPermitidos && !rolesPermitidos.includes(session.user.rol)) {
    return {
      ok: false,
      response: NextResponse.json({ error: mensajeRolInvalido }, { status: 403 }),
    };
  }

  return { ok: true, session };
}

/**
 * Helper para el catch genérico repetido en la mayoría de las rutas:
 *   console.error("Error ...:", error);
 *   return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
 *
 * Uso: return errorInterno(error, "creando trabajo");
 */
export function errorInterno(error: unknown, contexto: string): NextResponse {
  console.error(`Error ${contexto}:`, error);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}
