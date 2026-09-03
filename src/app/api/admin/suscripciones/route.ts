/**
 * API Route: GET /api/admin/suscripciones
 * Lista todas las suscripciones con filtros. Solo admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const estado = searchParams.get("estado");
    const plan = searchParams.get("plan");

    const where: any = {};
    if (estado) where.estado = estado;
    if (plan) where.plan = plan;

    const [suscripciones, total] = await Promise.all([
      prisma.suscripcion.findMany({
        where,
        include: {
          perfil: {
            select: {
              id: true,
              usuario: { select: { id: true, nombre: true, email: true, imagen: true } },
              ciudad: true,
              oficios: { select: { oficio: { select: { nombre: true } } } },
            },
          },
          pagos: {
            orderBy: { fechaPago: "desc" },
            take: 3,
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fechaInicio: "desc" },
      }),
      prisma.suscripcion.count({ where }),
    ]);

    return NextResponse.json({
      suscripciones,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error admin listando suscripciones:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
