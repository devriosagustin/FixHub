/**
 * API Route: GET /api/admin/usuarios
 * 
 * Lista todos los usuarios con paginación y filtros.
 * Solo accesible por admins.
 * 
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: por página (default: 20)
 *   - rol: filtrar por rol (CLIENTE, PROFESIONAL, ADMIN)
 *   - busqueda: buscar por nombre o email
 * 
 * PUT /api/admin/usuarios
 * 
 * Actualiza el rol de un usuario.
 * Body: { userId: string, rol: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const rol = searchParams.get("rol");
    const busqueda = searchParams.get("busqueda");

    // Construir filtros
    const where: any = {};
    if (rol) where.rol = rol;
    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { email: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          email: true,
          imagen: true,
          rol: true,
          createdAt: true,
          perfilProfesional: {
            select: {
              id: true,
              estado: true,
              verificado: true,
              ciudad: true,
              oficios: {
                select: { oficio: { select: { nombre: true } } },
              },
            },
          },
          _count: {
            select: {
              resenasCreadas: true,
              mensajesEnviados: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.usuario.count({ where }),
    ]);

    return NextResponse.json({
      usuarios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error admin listando usuarios:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, rol } = body;

    if (!userId || !rol) {
      return NextResponse.json(
        { error: "userId y rol son requeridos" },
        { status: 400 }
      );
    }

    if (!["CLIENTE", "PROFESIONAL", "ADMIN"].includes(rol)) {
      return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
    }

    // No permitir que el admin se cambie su propio rol
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol" },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.update({
      where: { id: userId },
      data: { rol },
      select: { id: true, nombre: true, email: true, rol: true },
    });

    return NextResponse.json({ usuario });
  } catch (err) {
    console.error("Error admin actualizando usuario:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
