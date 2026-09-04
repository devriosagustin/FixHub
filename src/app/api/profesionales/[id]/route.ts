import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/profesionales/[id] - Ver perfil público de un profesional
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id },
      include: {
        usuario: { select: { nombre: true, imagen: true } },
        oficios: { include: { oficio: true } },
        galeriaFotos: { orderBy: { orden: "asc" } },
        certificaciones: true,
        horarios: { orderBy: { diaSemana: "asc" } },
        resenas: {
          where: { aprobada: true },
          include: {
            cliente: { select: { nombre: true, imagen: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        suscripcion: { select: { plan: true, estado: true } },
        documentos: {
          select: { tipo: true, estado: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!perfil) {
      return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });
    }

    // Solo mostrar perfiles aprobados públicamente
    if (perfil.estado !== "APROBADO") {
      return NextResponse.json({ error: "Perfil no disponible" }, { status: 404 });
    }

    // Incrementar visitas (async, no bloquear respuesta)
    prisma.perfilProfesional.update({
      where: { id },
      data: { visitas: { increment: 1 } },
    }).catch(() => {});

    // Calcular promedio de estrellas
    const promedioEstrellas =
      perfil.resenas.length > 0
        ? perfil.resenas.reduce((sum, r) => sum + r.puntuacion, 0) / perfil.resenas.length
        : 0;

    return NextResponse.json({
      ...perfil,
      promedioEstrellas: Math.round(promedioEstrellas * 10) / 10,
      totalResenas: perfil.resenas.length,
    });
  } catch (error) {
    return errorInterno(error, "obteniendo perfil");
  }
}

// PUT /api/profesionales/[id] - Actualizar mi perfil (propietario)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const { id } = await params;

    // Verificar que el perfil pertenece al usuario actual
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!perfil || perfil.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    // Campos permitidos para actualización
    const camposPermitidos = {
      titulo: body.titulo,
      descripcion: body.descripcion,
      anosExperiencia: body.anosExperiencia,
      direccion: body.direccion,
      ciudad: body.ciudad,
      barrio: body.barrio,
      latitud: body.latitud,
      longitud: body.longitud,
      radioCobertura: body.radioCobertura,
      telefono: body.telefono,
      whatsapp: body.whatsapp,
      sitioWeb: body.sitioWeb,
      instagram: body.instagram,
      facebook: body.facebook,
      tipoPrecio: body.tipoPrecio,
      precioPorHora: body.precioPorHora,
      videoUrl: body.videoUrl,
    };

    // Filtrar campos undefined para no sobreescribir con null
    const datosActualizados = Object.fromEntries(
      Object.entries(camposPermitidos).filter(([, v]) => v !== undefined)
    );

    const actualizado = await prisma.perfilProfesional.update({
      where: { id },
      data: datosActualizados,
    });

    // Actualizar oficios si se proporcionaron
    if (body.oficios && Array.isArray(body.oficios)) {
      // Eliminar oficios actuales
      await prisma.oficioProfesional.deleteMany({ where: { perfilId: id } });

      // Crear nuevos
      for (const oficioSlug of body.oficios) {
        const oficio = await prisma.oficio.findUnique({ where: { slug: oficioSlug } });
        if (oficio) {
          await prisma.oficioProfesional.create({
            data: { perfilId: id, oficioId: oficio.id },
          });
        }
      }
    }

    return NextResponse.json({ perfil: actualizado });
  } catch (error) {
    return errorInterno(error, "actualizando perfil");
  }
}
