import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validación para registro de profesional
const schemaRegistroProfesional = z.object({
  titulo: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  descripcion: z.string().min(20, "La descripción debe tener al menos 20 caracteres"),
  anosExperiencia: z.number().min(0).max(60).optional(),
  direccion: z.string().optional(),
  ciudad: z.string().min(1, "La ciudad es obligatoria"),
  barrio: z.string().optional(),
  telefono: z.string().min(6, "El teléfono es obligatorio"),
  whatsapp: z.string().regex(/^\+?[0-9\s()\-]+$/, "El número de WhatsApp no es válido").optional(),
  tipoPrecio: z.enum(["por_hora", "convenir"]).default("convenir"),
  precioPorHora: z.number().positive().optional(),
  oficios: z.array(z.string()).min(1, "Seleccioná al menos un oficio"),
});

// POST /api/profesionales - Crear perfil de profesional
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    // 2. Verificar que sea CLIENTE (los profesionales se registran desde perfil cliente)
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // 3. Verificar que no tenga ya un perfil de profesional
    const perfilExistente = await prisma.perfilProfesional.findUnique({
      where: { userId: session.user.id },
    });

    if (perfilExistente) {
      return NextResponse.json(
        { error: "Ya tenés un perfil de profesional registrado" },
        { status: 400 }
      );
    }

    // 4. Validar datos
    const body = await request.json();
    const datosValidados = schemaRegistroProfesional.parse(body);

    // 5. Crear perfil profesional + cambiar rol del usuario en una transacción
    const perfil = await prisma.$transaction(async (tx) => {
      // Crear el perfil
      const nuevoPerfil = await tx.perfilProfesional.create({
        data: {
          userId: session.user.id,
          titulo: datosValidados.titulo,
          descripcion: datosValidados.descripcion,
          anosExperiencia: datosValidados.anosExperiencia,
          direccion: datosValidados.direccion,
          ciudad: datosValidados.ciudad,
          barrio: datosValidados.barrio,
          telefono: datosValidados.telefono,
          whatsapp: datosValidados.whatsapp,
          tipoPrecio: datosValidados.tipoPrecio,
          precioPorHora: datosValidados.precioPorHora,
          estado: "PENDIENTE", // Esperando aprobación del admin
        },
      });

      // Asociar oficios
      for (const oficioSlug of datosValidados.oficios) {
        const oficio = await tx.oficio.findUnique({
          where: { slug: oficioSlug },
        });

        if (oficio) {
          await tx.oficioProfesional.create({
            data: {
              perfilId: nuevoPerfil.id,
              oficioId: oficio.id,
            },
          });
        }
      }

      // Cambiar rol del usuario a PROFESIONAL
      await tx.usuario.update({
        where: { id: session.user.id },
        data: { rol: "PROFESIONAL" },
      });

      // Crear suscripción gratuita por defecto
      await tx.suscripcion.create({
        data: {
          perfilId: nuevoPerfil.id,
          plan: "GRATUITO",
          estado: "ACTIVA",
        },
      });

      return nuevoPerfil;
    });

    return NextResponse.json(
      {
        mensaje: "Perfil creado exitosamente. Pendiente de aprobación por administrador.",
        perfil,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: error.issues },
        { status: 400 }
      );
    }

    return errorInterno(error, "creando perfil profesional");
  }
}

// GET /api/profesionales - Listar profesionales aprobados (público)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const oficio = searchParams.get("oficio");
    const ciudad = searchParams.get("ciudad");

    const where: Record<string, unknown> = {
      estado: "APROBADO",
    };

    if (ciudad) {
      where.ciudad = { contains: ciudad, mode: "insensitive" };
    }

    if (oficio) {
      where.oficios = {
        some: {
          oficio: { slug: oficio },
        },
      };
    }

    const [profesionales, total] = await Promise.all([
      prisma.perfilProfesional.findMany({
        where,
        include: {
          usuario: { select: { nombre: true, imagen: true } },
          oficios: { include: { oficio: true } },
          resenas: { select: { puntuacion: true } },
          suscripcion: { select: { plan: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.perfilProfesional.count({ where }),
    ]);

    return NextResponse.json({
      profesionales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorInterno(error, "listando profesionales");
  }
}
