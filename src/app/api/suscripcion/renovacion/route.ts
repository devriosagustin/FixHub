/**
 * API Route: PATCH /api/suscripcion/renovacion
 *
 * Activa o desactiva la renovación automática de la suscripción.
 *
 * Body: { activar: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorInterno } from "@/lib/api-auth";

export async function PATCH(request: NextRequest) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const body = await request.json();
    const { activar } = body;
    if (typeof activar !== "boolean") {
      return NextResponse.json({ error: "Se requiere el campo `activar` (boolean)" }, { status: 400 });
    }

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!perfil) {
      return NextResponse.json({ error: "No tienes un perfil profesional" }, { status: 404 });
    }

    const suscripcion = await prisma.suscripcion.findUnique({
      where: { perfilId: perfil.id },
    });

    if (!suscripcion) {
      return NextResponse.json({ error: "No tienes una suscripción" }, { status: 404 });
    }

    if (suscripcion.plan === "GRATUITO") {
      return NextResponse.json(
        { error: "El plan gratuito no tiene renovación automática" },
        { status: 400 }
      );
    }

    const actualizada = await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { renovacionAuto: activar },
    });

    return NextResponse.json({
      mensaje: activar
        ? "Renovación automática activada. Se renovará tu plan al finalizar el período."
        : "Renovación automática desactivada.",
      renovacionAuto: actualizada.renovacionAuto,
    });
  } catch (err) {
    return errorInterno(err, "actualizando renovación");
  }
}
