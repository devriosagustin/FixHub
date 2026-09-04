/**
 * API Route: GET /api/chat/conversaciones
 * 
 * Lista todas las conversaciones del usuario autenticado.
 * Si es cliente, muestra sus conversaciones con profesionales.
 * Si es profesional, muestra las conversaciones que tiene en su perfil.
 * 
 * Retorna: { conversaciones: Conversacion[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const userId = session.user.id;

    // Buscar el perfil profesional del usuario (si tiene uno)
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Buscar conversaciones donde el usuario es cliente O profesional
    const conversaciones = await prisma.conversacion.findMany({
      where: {
        OR: [
          // Conversaciones donde soy el cliente
          { clienteId: userId },
          // Conversaciones donde soy el profesional (mi perfil)
          ...(perfil ? [{ profesionalId: perfil.id }] : []),
        ],
        activa: true,
      },
      include: {
        // Datos del cliente
        cliente: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
          },
        },
        // Datos del profesional (del perfil)
        profesional: {
          select: {
            id: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
                imagen: true,
              },
            },
            oficios: {
              include: {
                oficio: { select: { nombre: true } },
              },
            },
            verificado: true,
          },
        },
        // Último mensaje para preview
        mensajes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            contenido: true,
            emisorId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { ultimoMensajeAt: "desc" },
    });

    // Contar mensajes no leídos para cada conversación
    const conversacionesConNoLeidos = await Promise.all(
      conversaciones.map(async (conv) => {
        // Contar mensajes no leídos que NO fueron enviados por mí
        const noLeidos = await prisma.mensaje.count({
          where: {
            conversacionId: conv.id,
            emisorId: { not: userId },
            leido: false,
          },
        });

        return {
          ...conv,
          mensajesNoLeidos: noLeidos,
        };
      })
    );

    return NextResponse.json({ conversaciones: conversacionesConNoLeidos });
  } catch (err) {
    return errorInterno(err, "al listar conversaciones");
  }
}

/**
 * API Route: POST /api/chat/conversaciones
 * 
 * Crea una nueva conversación o retorna una existente
 * entre un cliente y un profesional.
 * 
 * Body: { perfilProfesionalId: string }
 * Retorna: { conversacion: Conversacion }
 */
export async function POST(request: NextRequest) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const userId = session.user.id;
    const body = await request.json();
    const { perfilProfesionalId } = body;

    if (!perfilProfesionalId) {
      return NextResponse.json(
        { error: "Se requiere perfilProfesionalId" },
        { status: 400 }
      );
    }

    // Verificar que el profesional exista y esté aprobado
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id: perfilProfesionalId },
      select: { id: true, estado: true, userId: true },
    });

    if (!perfil || perfil.estado !== "APROBADO") {
      return NextResponse.json(
        { error: "Profesional no encontrado o no disponible" },
        { status: 404 }
      );
    }

    // No permitir crear conversación con uno mismo
    if (perfil.userId === userId) {
      return NextResponse.json(
        { error: "No puedes chatear contigo mismo" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una conversación entre estos dos
    const existente = await prisma.conversacion.findUnique({
      where: {
        clienteId_profesionalId: {
          clienteId: userId,
          profesionalId: perfilProfesionalId,
        },
      },
      include: {
        cliente: {
          select: { id: true, nombre: true, imagen: true },
        },
        profesional: {
          select: {
            id: true,
            usuario: { select: { id: true, nombre: true, imagen: true } },
            oficios: { include: { oficio: { select: { nombre: true } } } },
            verificado: true,
          },
        },
      },
    });

    if (existente) {
      // Ya existe, retornar la conversación existente
      return NextResponse.json({ conversacion: existente });
    }

    // Crear nueva conversación
    const nuevaConversacion = await prisma.conversacion.create({
      data: {
        clienteId: userId,
        profesionalId: perfilProfesionalId,
        initBy: userId,
      },
      include: {
        cliente: {
          select: { id: true, nombre: true, imagen: true },
        },
        profesional: {
          select: {
            id: true,
            usuario: { select: { id: true, nombre: true, imagen: true } },
            oficios: { include: { oficio: { select: { nombre: true } } } },
            verificado: true,
          },
        },
      },
    });

    // Incrementar contador de contactos del profesional y notificarlo
    await prisma.perfilProfesional.update({
      where: { id: perfilProfesionalId },
      data: { contactos: { increment: 1 } },
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: perfil.userId,
        tipo: "NUEVO_CONTACTO",
        titulo: "Un cliente te contactó",
        mensaje: `${nuevaConversacion.cliente.nombre} inició una conversación contigo.`,
        enlace: `/chat?conversacion=${nuevaConversacion.id}`,
      },
    });

    return NextResponse.json({ conversacion: nuevaConversacion }, { status: 201 });
  } catch (err) {
    return errorInterno(err, "al crear conversación");
  }
}
