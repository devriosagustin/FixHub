import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { tieneSuscripcionPagaActiva } from "@/lib/suscripcion";

// Schema de validación para crear un trabajo
const schemaCrearTrabajo = z.object({
  titulo: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  descripcion: z.string().min(20, "La descripción debe tener al menos 20 caracteres"),
  oficioId: z.string().min(1, "Seleccioná un oficio"),
  ciudad: z.string().min(1, "La ciudad es obligatoria"),
  barrio: z.string().optional(),
  tipoContratacion: z.enum(["POR_HORA", "PRESUPUESTO", "CONVENIR"]).default("CONVENIR"),
  presupuestoMin: z.number().nonnegative().optional(),
  presupuestoMax: z.number().nonnegative().optional(),
  fechaLimite: z.string().datetime().optional().nullable(),
  whatsappContacto: z
    .string()
    .regex(/^\+?[0-9\s()\-]+$/, "El WhatsApp de contacto no es válido")
    .optional(),
});

// POST /api/trabajos - Publicar un trabajo (cliente autenticado)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Solo clientes pueden publicar trabajos
    if (session.user.rol !== "CLIENTE" && session.user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los clientes pueden publicar trabajos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const datos = schemaCrearTrabajo.parse(body);

    const trabajo = await prisma.trabajo.create({
      data: {
        clienteId: session.user.id,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        oficioId: datos.oficioId,
        ciudad: datos.ciudad,
        barrio: datos.barrio,
        tipoContratacion: datos.tipoContratacion,
        presupuestoMin: datos.presupuestoMin,
        presupuestoMax: datos.presupuestoMax,
        fechaLimite: datos.fechaLimite ? new Date(datos.fechaLimite) : null,
        whatsappContacto: datos.whatsappContacto,
      },
    });

    return NextResponse.json({ trabajo }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creando trabajo:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// GET /api/trabajos - Listar trabajos abiertos (para profesionales suscritos)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Solo profesionales (o admin) ven el listado de trabajos
    if (session.user.rol !== "PROFESIONAL" && session.user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los profesionales pueden ver trabajos" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const oficioId = searchParams.get("oficioId") || undefined;
    const ciudad = searchParams.get("ciudad") || undefined;
    const presupuestoMax = searchParams.get("presupuestoMax");

    const where: Record<string, unknown> = {
      estado: "ABIERTO",
    };

    if (oficioId) where.oficioId = oficioId;
    if (ciudad) where.ciudad = { contains: ciudad, mode: "insensitive" };
    if (presupuestoMax && !isNaN(parseFloat(presupuestoMax))) {
      where.OR = [
        { presupuestoMax: { lte: parseFloat(presupuestoMax) } },
        { presupuestoMax: null },
      ];
    }

    const trabajos = await prisma.trabajo.findMany({
      where,
      include: {
        oficio: { select: { nombre: true, icono: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const tieneAcceso = await tieneSuscripcionPagaActiva(session.user.id);

    return NextResponse.json({ trabajos, tieneAcceso });
  } catch (error) {
    console.error("Error listando trabajos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
