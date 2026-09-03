import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/profesionales - Listar todos los profesionales (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;

    const [profesionales, total] = await Promise.all([
      prisma.perfilProfesional.findMany({
        where,
        include: {
          usuario: { select: { id: true, nombre: true, email: true, imagen: true } },
          oficios: { include: { oficio: true } },
          documentos: { select: { tipo: true, url: true, estado: true } },
          suscripcion: { select: { plan: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.perfilProfesional.count({ where }),
    ]);

    return NextResponse.json({
      profesionales,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error admin listando profesionales:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
