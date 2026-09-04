import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorInterno } from "@/lib/api-auth";

// GET /api/oficios - Obtener todos los oficios activos
export async function GET() {
  try {
    const oficios = await prisma.oficio.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(oficios);
  } catch (error) {
    return errorInterno(error, "obteniendo oficios");
  }
}
