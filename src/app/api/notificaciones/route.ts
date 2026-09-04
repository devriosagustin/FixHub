import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/notificaciones - Listar mis notificaciones
export async function GET(request: NextRequest) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const [notificaciones, total, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where: { usuarioId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notificacion.count({ where: { usuarioId: session.user.id } }),
      prisma.notificacion.count({
        where: { usuarioId: session.user.id, leida: false },
      }),
    ]);

    return NextResponse.json({ notificaciones, total, noLeidas });
  } catch (error) {
    return errorInterno(error, "obteniendo notificaciones");
  }
}

// PATCH /api/notificaciones - Marcar como leídas
export async function PATCH(request: NextRequest) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const body = await request.json();
    const { id } = body;

    if (id) {
      // Marcar una notificación específica
      const notif = await prisma.notificacion.findUnique({ where: { id } });
      if (!notif || notif.usuarioId !== session.user.id) {
        return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
      }
      await prisma.notificacion.update({ where: { id }, data: { leida: true } });
    } else {
      // Marcar todas como leídas
      await prisma.notificacion.updateMany({
        where: { usuarioId: session.user.id, leida: false },
        data: { leida: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorInterno(error, "actualizando notificaciones");
  }
}
