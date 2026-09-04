/**
 * API Route: GET /api/admin/pagos
 * Lista todos los pagos con filtros. Solo admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const resultado = await requireAuth(["ADMIN"]);
    if (!resultado.ok) return resultado.response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const estadoPago = searchParams.get("estadoPago");

    const where: any = {};
    if (estadoPago) where.estadoPago = estadoPago;

    const [pagos, total] = await Promise.all([
      prisma.pago.findMany({
        where,
        include: {
          suscripcion: {
            include: {
              perfil: {
                select: {
                  usuario: { select: { nombre: true, email: true } },
                  oficios: { select: { oficio: { select: { nombre: true } } } },
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fechaPago: "desc" },
      }),
      prisma.pago.count({ where }),
    ]);

    const ingresosTotales = await prisma.pago.aggregate({
      where: { estadoPago: "approved" },
      _sum: { monto: true },
    });

    return NextResponse.json({
      pagos,
      ingresosTotales: ingresosTotales._sum.monto || 0,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return errorInterno(err, "admin listando pagos");
  }
}
