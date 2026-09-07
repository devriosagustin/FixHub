/**
 * API Route: POST /api/profesionales/[id]/resenas
 * 
 * Permite a un cliente autenticado dejar una reseña a un profesional.
 * 
 * Reglas:
 * - Solo usuarios con rol CLIENTE pueden reseñar
 * - Un cliente solo puede dejar UNA reseña por profesional (constraint en BD)
 * - El profesional debe estar APROBADO
 * - Se verifica que exista una conversación entre ambos (para evitar reseñas falsas)
 * 
 * Body: { puntuacion: number (1-5), comentario: string, fotoUrl?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { urlHttpSchema } from "@/lib/validaciones";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultado = await requireAuth(
      ["CLIENTE"],
      "Solo los clientes pueden dejar reseñas"
    );
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const userId = session.user.id;
    const { id: perfilId } = await params;

    // Verificar que el profesional exista y esté aprobado
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id: perfilId },
      select: { id: true, estado: true, userId: true },
    });

    if (!perfil || perfil.estado !== "APROBADO") {
      return NextResponse.json(
        { error: "Profesional no encontrado o no disponible" },
        { status: 404 }
      );
    }

    // No permitir reseñarse a uno mismo
    if (perfil.userId === userId) {
      return NextResponse.json(
        { error: "No puedes reseñarte a ti mismo" },
        { status: 400 }
      );
    }

    // Verificar que exista una conversación entre el cliente y el profesional
    // Esto asegura que solo clientes que interactuaron pueden dejar reseñas
    const conversacion = await prisma.conversacion.findFirst({
      where: {
        clienteId: userId,
        profesionalId: perfilId,
      },
    });

    if (!conversacion) {
      return NextResponse.json(
        {
          error: "Debes haber tenido una conversación con este profesional para dejar una reseña",
        },
        { status: 403 }
      );
    }

    // Verificar si ya existe una reseña de este cliente para este profesional
    const existente = await prisma.resena.findUnique({
      where: {
        perfilId_clienteId: {
          perfilId,
          clienteId: userId,
        },
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya dejaste una reseña a este profesional" },
        { status: 409 }
      );
    }

    // Parsear y validar el body
    const body = await request.json();
    const { puntuacion, comentario, fotoUrl } = body;

    // Validar puntuación
    if (!puntuacion || typeof puntuacion !== "number") {
      return NextResponse.json(
        { error: "La puntuación es obligatoria" },
        { status: 400 }
      );
    }

    if (puntuacion < 1 || puntuacion > 5 || !Number.isInteger(puntuacion)) {
      return NextResponse.json(
        { error: "La puntuación debe ser un número entero del 1 al 5" },
        { status: 400 }
      );
    }

    // Validar comentario
    if (!comentario || typeof comentario !== "string") {
      return NextResponse.json(
        { error: "El comentario es obligatorio" },
        { status: 400 }
      );
    }

    if (comentario.trim().length < 10) {
      return NextResponse.json(
        { error: "El comentario debe tener al menos 10 caracteres" },
        { status: 400 }
      );
    }

    if (comentario.trim().length > 1000) {
      return NextResponse.json(
        { error: "El comentario no puede exceder los 1000 caracteres" },
        { status: 400 }
      );
    }

    // Validar fotoUrl: viene del endpoint de upload (ReviewForm.tsx), pero
    // el body lo manda el cliente como cualquier otro campo -- sin esto,
    // se podía guardar directamente (sin pasar por el upload) una URL con
    // esquema "javascript:"/"data:" que después se renderiza como <a href>
    // en /admin/resenas (clickeable por un admin) y como <img src> en el
    // perfil público. Mismo criterio que sitioWeb/videoUrl en
    // profesionales/[id]/route.ts -- ver AGENTS.md, backlog de seguridad.
    let fotoUrlValidada: string | null = null;
    if (fotoUrl !== undefined && fotoUrl !== null && fotoUrl !== "") {
      const parseo = urlHttpSchema.safeParse(fotoUrl);
      if (!parseo.success) {
        return NextResponse.json(
          { error: "La foto adjunta no es una URL válida" },
          { status: 400 }
        );
      }
      fotoUrlValidada = parseo.data;
    }

    // Crear la reseña
    const resena = await prisma.resena.create({
      data: {
        perfilId,
        clienteId: userId,
        puntuacion,
        comentario: comentario.trim(),
        fotoUrl: fotoUrlValidada,
        aprobada: true, // Por defecto aprobada; el admin puede rechazarla
      },
      include: {
        cliente: {
          select: { id: true, nombre: true, imagen: true },
        },
      },
    });

    // Notificar al profesional que recibió una reseña
    await prisma.notificacion.create({
      data: {
        usuarioId: perfil.userId,
        tipo: "RESENA_RECIBIDA",
        titulo: "¡Recibiste una nueva reseña!",
        mensaje: `${resena.cliente.nombre} te dejó ${puntuacion} estrella${puntuacion > 1 ? "s" : ""}: "${comentario.trim().slice(0, 90)}${comentario.trim().length > 90 ? "..." : ""}"`,
        enlace: `/perfil/${perfilId}`,
      },
    });

    return NextResponse.json({ resena }, { status: 201 });
  } catch (err) {
    // Error de constraint unique (ya existe una reseña)
    if ((err as any).code === "P2002") {
      return NextResponse.json(
        { error: "Ya dejaste una reseña a este profesional" },
        { status: 409 }
      );
    }

    return errorInterno(err, "al crear reseña");
  }
}

/**
 * API Route: GET /api/profesionales/[id]/resenas
 * 
 * Obtiene las reseñas aprobadas de un profesional.
 * 
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: cantidad por página (default: 10)
 * 
 * Retorna: { resenas: Resena[], pagination: {...} }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: perfilId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    // Verificar que el profesional exista
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id: perfilId },
      select: { id: true },
    });

    if (!perfil) {
      return NextResponse.json(
        { error: "Profesional no encontrado" },
        { status: 404 }
      );
    }

    // Obtener reseñas aprobadas con paginación
    const [resenas, total] = await Promise.all([
      prisma.resena.findMany({
        where: {
          perfilId,
          aprobada: true,
        },
        include: {
          cliente: {
            select: { id: true, nombre: true, imagen: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.resena.count({
        where: {
          perfilId,
          aprobada: true,
        },
      }),
    ]);

    return NextResponse.json({
      resenas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return errorInterno(err, "al obtener reseñas");
  }
}
