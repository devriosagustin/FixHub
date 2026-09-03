import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/trabajos/mios - Trabajos publicados por el cliente autenticado
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

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
    console.error("Error listando mis trabajos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
