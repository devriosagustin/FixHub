import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tieneSuscripcionPagaActiva } from "@/lib/suscripcion";

// GET /api/trabajos/[id] - Detalle de un trabajo
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const trabajo = await prisma.trabajo.findUnique({
      where: { id },
      include: {
        oficio: { select: { nombre: true, icono: true } },
        cliente: {
          select: { id: true, nombre: true, email: true, imagen: true },
        },
        postulaciones: {
          include: {
            perfil: {
              select: {
                id: true,
                titulo: true,
                usuario: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!trabajo) {
      return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
    }

    const esPropietario =
      session.user.rol === "CLIENTE" && trabajo.clienteId === session.user.id;

    // El cliente dueño ve todo (incluyendo postulaciones)
    if (esPropietario || session.user.rol === "ADMIN") {
      return NextResponse.json({ trabajo, esPropietario: true });
    }

    // Un profesional debe tener suscripción paga para ver el detalle/contacto
    if (session.user.rol !== "PROFESIONAL") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const tieneAcceso = await tieneSuscripcionPagaActiva(session.user.id);
    if (!tieneAcceso) {
      return NextResponse.json(
        { error: "Necesitás una suscripción paga para ver este trabajo", requiereSuscripcion: true },
        { status: 403 }
      );
    }

    // Para un profesional: ocultar postulaciones de otros, mostrar contacto del cliente
    const { postulaciones, ...datosPublicos } = trabajo;
    return NextResponse.json({ trabajo: datosPublicos, esPropietario: false });
  } catch (error) {
    console.error("Error obteniendo trabajo:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
