import { NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/trabajos/mios - Trabajos publicados por el cliente autenticado
export async function GET() {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const trabajos = await prisma.trabajo.findMany({
      where: { clienteId: session.user.id },
      include: {
        oficio: { select: { nombre: true, icono: true } },
        _count: { select: { postulaciones: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ trabajos });
  } catch (error) {
    return errorInterno(error, "listando mis trabajos");
  }
}
