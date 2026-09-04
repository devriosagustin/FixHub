/**
 * API Route: PATCH /api/chat/conversaciones/[id]/leer
 * 
 * Marca todos los mensajes no leídos de una conversación como leídos
 * para el usuario autenticado.
 * 
 * Retorna: { success: true, marcados: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const userId = session.user.id;
    const { id: conversacionId } = await params;

    // Verificar que el usuario participa en la conversación
    const conversacion = await prisma.conversacion.findUnique({
      where: { id: conversacionId },
      select: {
        clienteId: true,
        profesional: { select: { userId: true } },
      },
    });

    if (!conversacion) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    const esParticipante =
      conversacion.clienteId === userId ||
      conversacion.profesional.userId === userId;

    if (!esParticipante) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Marcar como leídos todos los mensajes que YO NO envié y que están sin leer
    const actualizacion = await prisma.mensaje.updateMany({
      where: {
        conversacionId,
        emisorId: { not: userId },
        leido: false,
      },
      data: { leido: true },
    });

    return NextResponse.json({
      success: true,
      marcados: actualizacion.count,
    });
  } catch (err) {
    return errorInterno(err, "al marcar mensajes como leídos");
  }
}
