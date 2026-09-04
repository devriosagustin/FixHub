/**
 * API Route: GET /api/chat/conversaciones/[id]/mensajes
 * 
 * Obtiene los mensajes de una conversación específica.
 * Soporta paginación con cursor (mensajes anteriores).
 * 
 * Query params:
 *   - cursor: ID del mensaje desde el cual cargar anteriores (opcional)
 *   - limit: cantidad de mensajes a cargar (default: 50)
 * 
 * Retorna: { mensajes: Mensaje[], hayMas: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const userId = session.user.id;
    const { id: conversacionId } = await params;

    // Verificar que el usuario participa en esta conversación
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

    // Verificar que el usuario sea el cliente o el profesional
    const esParticipante =
      conversacion.clienteId === userId ||
      conversacion.profesional.userId === userId;

    if (!esParticipante) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Obtener parámetros de paginación
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Buscar mensajes con paginación por cursor
    const mensajes = await prisma.mensaje.findMany({
      where: {
        conversacionId,
        // Si hay cursor, buscar mensajes anteriores a ese
        ...(cursor
          ? {
              createdAt: {
                lt: (
                  await prisma.mensaje.findUnique({
                    where: { id: cursor },
                    select: { createdAt: true },
                  })
                )?.createdAt,
              },
            }
          : {}),
      },
      include: {
        emisor: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Tomar uno extra para saber si hay más
    });

    // Determinar si hay más mensajes
    const hayMas = mensajes.length > limit;
    // Si hay más, quitar el último (era solo para verificar)
    const mensajesLimitados = hayMas ? mensajes.slice(0, limit) : mensajes;

    // Invertir para que estén en orden cronológico (más antiguo primero)
    mensajesLimitados.reverse();

    return NextResponse.json({
      mensajes: mensajesLimitados,
      hayMas,
    });
  } catch (err) {
    return errorInterno(err, "al obtener mensajes");
  }
}
