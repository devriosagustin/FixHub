/**
 * API Route: GET /api/chat/unread
 * 
 * Retorna el total de mensajes no leídos del usuario autenticado.
 * Se usa para mostrar el badge en el navbar.
 * 
 * Retorna: { total: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ total: 0 });
    }

    const userId = session.user.id;

    // Buscar el perfil profesional del usuario
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Contar mensajes no leídos en conversaciones donde participo
    const total = await prisma.mensaje.count({
      where: {
        leido: false,
        emisorId: { not: userId },
        conversacion: {
          OR: [
            { clienteId: userId },
            ...(perfil ? [{ profesionalId: perfil.id }] : []),
          ],
          activa: true,
        },
      },
    });

    return NextResponse.json({ total });
  } catch (err) {
    console.error("Error al contar mensajes no leídos:", err);
    return NextResponse.json({ total: 0 });
  }
}
