import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/oficios - Obtener todos los oficios activos
export async function GET() {
  try {
    const oficios = await prisma.oficio.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(oficios);
  } catch (error) {
    console.error("Error obteniendo oficios:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
