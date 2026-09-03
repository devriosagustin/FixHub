import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { tieneSuscripcionPagaActiva } from "@/lib/suscripcion";

const schemaPostular = z.object({
  mensaje: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
  presupuesto: z.number().nonnegative().optional(),
});

// POST /api/trabajos/[id]/postular - Un profesional se postula a un trabajo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.rol !== "PROFESIONAL") {
      return NextResponse.json(
        { error: "Solo los profesionales pueden postularse" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Requiere suscripción paga activa
    const tieneAcceso = await tieneSuscripcionPagaActiva(session.user.id);
    if (!tieneAcceso) {
      return NextResponse.json(
        { error: "Necesitás una suscripción paga para postularte", requiereSuscripcion: true },
        { status: 403 }
      );
    }

    const trabajo = await prisma.trabajo.findUnique({ where: { id } });
    if (!trabajo) {
      return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
    }
    if (trabajo.estado !== "ABIERTO") {
      return NextResponse.json({ error: "Este trabajo ya no está abierto" }, { status: 400 });
    }

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!perfil) {
      return NextResponse.json(
        { error: "No tenés un perfil profesional" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const datos = schemaPostular.parse(body);

    // Evitar postulación duplicada (unique [trabajoId, perfilId])
    const existente = await prisma.postulacion.findUnique({
      where: { trabajoId_perfilId: { trabajoId: id, perfilId: perfil.id } },
    });
    if (existente) {
      return NextResponse.json(
        { error: "Ya te postulaste a este trabajo" },
        { status: 400 }
      );
    }

    const postulacion = await prisma.postulacion.create({
      data: {
        trabajoId: id,
        perfilId: perfil.id,
        mensaje: datos.mensaje,
        presupuesto: datos.presupuesto,
      },
    });

    // Notificar al cliente
    await prisma.notificacion.create({
      data: {
        usuarioId: trabajo.clienteId,
        tipo: "NUEVO_CONTACTO",
        titulo: "Nuevo postulante a tu trabajo",
        mensaje: `Un profesional se postuló a "${trabajo.titulo}".`,
        enlace: `/cliente/trabajos/${id}`,
      },
    }).catch(() => {});

    return NextResponse.json({ postulacion }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: error.issues },
        { status: 400 }
      );
    }
    console.error("Error al postularse:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
