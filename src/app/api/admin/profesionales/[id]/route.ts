import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schemaAprobar = z.object({
  accion: z.enum(["aprobar", "rechazar", "suspender"]),
  motivo: z.string().optional(),
});

// PUT /api/admin/profesionales/[id] - Aprobar, rechazar o suspender profesional
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultado = await requireAuth(["ADMIN"]);
    if (!resultado.ok) return resultado.response;

    const { id } = await params;
    const body = await request.json();
    const { accion, motivo } = schemaAprobar.parse(body);

    // Buscar el perfil
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id },
      include: { usuario: { select: { email: true, nombre: true } } },
    });

    if (!perfil) {
      return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });
    }

    // Mapear acción a estado
    const estadoMap: Record<string, string> = {
      aprobar: "APROBADO",
      rechazar: "RECHAZADO",
      suspender: "SUSPENDIDO",
    };

    // Actualizar estado del perfil
    const actualizado = await prisma.perfilProfesional.update({
      where: { id },
      data: {
        estado: estadoMap[accion] as "APROBADO" | "RECHAZADO" | "SUSPENDIDO",
        verificado: accion === "aprobar",
      },
    });

    // Verificación automática de documentos DNI:
    // al aprobar se aprueban los documentos; al rechazar/suspender se rechazan.
    const estadoDocs = accion === "aprobar" ? "APROBADO" : "RECHAZADO";
    await prisma.documentoVerificacion.updateMany({
      where: { perfilId: id },
      data: {
        estado: estadoDocs as "APROBADO" | "RECHAZADO",
        motivoRechazo:
          accion === "aprobar"
            ? null
            : motivo || "Documentación rechazada por no cumplir los requisitos.",
      },
    });

    // Crear notificación para el profesional
    const tituloMap: Record<string, string> = {
      aprobar: "¡Tu perfil fue aprobado!",
      rechazar: "Tu perfil fue rechazado",
      suspender: "Tu perfil fue suspendido",
    };

    const mensajeMap: Record<string, string> = {
      aprobar: "¡Felicitaciones! Tu perfil ya está visible públicamente en fixhub.",
      rechazar: motivo || "Tu perfil no cumple con los requisitos de verificación. Por favor, revisá la documentación.",
      suspender: motivo || "Tu perfil ha sido suspendido temporalmente. Contactá al soporte para más información.",
    };

    await prisma.notificacion.create({
      data: {
        usuarioId: perfil.userId,
        tipo: accion === "aprobar" ? "PROFESIONAL_APROBADO" : "PROFESIONAL_RECHAZADO",
        titulo: tituloMap[accion],
        mensaje: mensajeMap[accion],
        enlace: "/profesional/perfil",
      },
    });

    return NextResponse.json({
      mensaje: `Profesional ${accion} exitosamente`,
      perfil: actualizado,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: error.issues }, { status: 400 });
    }
    return errorInterno(error, "admin actualizando profesional");
  }
}
