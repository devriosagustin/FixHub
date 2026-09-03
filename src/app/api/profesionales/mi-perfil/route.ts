import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId: session.user.id },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, imagen: true } },
        oficios: { include: { oficio: true } },
        galeriaFotos: { orderBy: { orden: "asc" } },
        certificaciones: true,
        horarios: { orderBy: { diaSemana: "asc" } },
        documentos: {
          select: { tipo: true, estado: true },
          orderBy: { createdAt: "desc" },
        },
        suscripcion: { select: { plan: true, estado: true, fechaFin: true } },
      },
    });

    if (!perfil) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    return NextResponse.json(perfil);
  } catch (error) {
    console.error("Error obteniendo mi perfil:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
