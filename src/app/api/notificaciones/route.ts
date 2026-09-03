import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notificaciones - Listar mis notificaciones
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

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
    console.error("Error obteniendo notificaciones:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH /api/notificaciones - Marcar como leídas
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

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
    console.error("Error actualizando notificaciones:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
