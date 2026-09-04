import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/resenas
 * Aprueba o rechaza una reseña (moderación).
 * Body: { id, aprobar: boolean, motivoRechazo?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const resultado = await requireAuth(["ADMIN"]);
    if (!resultado.ok) return resultado.response;

    const body = await request.json();
    const { id, aprobar, motivoRechazo } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de reseña requerido" }, { status: 400 });
    }

    if (typeof aprobar !== "boolean") {
      return NextResponse.json({ error: "Se requiere el campo `aprobar` (boolean)" }, { status: 400 });
    }

    const resena = await prisma.resena.findUnique({ where: { id } });
    if (!resena) {
      return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });
    }

    const actualizada = await prisma.resena.update({
      where: { id },
      data: {
        aprobada: aprobar,
        motivoRechazo: aprobar ? null : motivoRechazo || "La reseña fue rechazada por moderación.",
      },
    });

    return NextResponse.json({
      mensaje: aprobar ? "Reseña aprobada" : "Reseña rechazada",
      resena: actualizada,
    });
  } catch (error) {
    return errorInterno(error, "admin moderando reseña");
  }
}

// GET /api/admin/resenas - Listar todas las reseñas (admin)
export async function GET(request: NextRequest) {
  try {
    const resultado = await requireAuth(["ADMIN"]);
    if (!resultado.ok) return resultado.response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [resenas, total] = await Promise.all([
      prisma.resena.findMany({
        include: {
          perfil: {
            include: {
              usuario: { select: { nombre: true } },
            },
          },
          cliente: { select: { nombre: true, imagen: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.resena.count(),
    ]);

    return NextResponse.json({
      resenas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorInterno(error, "admin listando reseñas");
  }
}

// DELETE /api/admin/resenas - Eliminar una reseña (admin)
export async function DELETE(request: NextRequest) {
  try {
    const resultado = await requireAuth(["ADMIN"]);
    if (!resultado.ok) return resultado.response;

    const { searchParams } = new URL(request.url);
    const resenaId = searchParams.get("id");

    if (!resenaId) {
      return NextResponse.json({ error: "ID de reseña requerido" }, { status: 400 });
    }

    const resena = await prisma.resena.findUnique({ where: { id: resenaId } });
    if (!resena) {
      return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });
    }

    await prisma.resena.delete({ where: { id: resenaId } });

    return NextResponse.json({ mensaje: "Reseña eliminada exitosamente" });
  } catch (error) {
    return errorInterno(error, "admin eliminando reseña");
  }
}
