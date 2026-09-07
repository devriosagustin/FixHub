/**
 * API Route: GET /api/profesionales/mi-perfil/metricas
 *
 * Métricas de interacción del perfil del profesional autenticado, para
 * el dashboard en /profesional/metricas. Ver src/lib/metricas.ts.
 *
 * Query param opcional: ?dias=N (default 30, máximo 90 para no dejar
 * pedir rangos arbitrariamente grandes).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { obtenerMetricasPerfil } from "@/lib/metricas";

export async function GET(request: NextRequest) {
  try {
    const resultado = await requireAuth(["PROFESIONAL"]);
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!perfil) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    const diasParam = Number(request.nextUrl.searchParams.get("dias"));
    const dias =
      Number.isFinite(diasParam) && diasParam > 0 ? Math.min(Math.trunc(diasParam), 90) : 30;

    const metricas = await obtenerMetricasPerfil(perfil.id, dias);

    return NextResponse.json(metricas);
  } catch (error) {
    return errorInterno(error, "obteniendo métricas de perfil");
  }
}
