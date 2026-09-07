import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");

const schemaHorarios = z.object({
  horarios: z.array(
    z.object({
      diaSemana: z.number().int().min(0).max(6),
      horaInicio: horaSchema,
      horaFin: horaSchema,
      activo: z.boolean(),
    })
  ),
});

// PUT /api/profesionales/[id]/horarios - Actualizar horarios (reemplaza todos)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const { id } = await params;

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!perfil || perfil.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const parseo = schemaHorarios.safeParse(await request.json());
    if (!parseo.success) {
      return NextResponse.json(
        { error: parseo.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
    const { horarios } = parseo.data;

    // Eliminar horarios actuales y crear nuevos en transacción
    await prisma.$transaction(async (tx) => {
      await tx.horarioAtencion.deleteMany({ where: { perfilId: id } });

      for (const h of horarios) {
        await tx.horarioAtencion.create({
          data: {
            perfilId: id,
            diaSemana: h.diaSemana,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
            activo: h.activo,
          },
        });
      }
    });

    return NextResponse.json({ mensaje: "Horarios actualizados" });
  } catch (error) {
    return errorInterno(error, "actualizando horarios");
  }
}
