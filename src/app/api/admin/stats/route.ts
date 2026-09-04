import { NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/stats - Estadísticas generales del admin + actividad reciente
export async function GET() {
  try {
    const resultado = await requireAuth(["ADMIN"]);
    if (!resultado.ok) return resultado.response;

    const [
      totalProfesionales,
      profesionalesPendientes,
      profesionalesAprobados,
      totalClientes,
      totalResenas,
      totalMensajes,
      resenasPendientes,
      suscripcionesActivas,
      ingresosTotales,
      totalUsuarios,
      profesionalesRecientes,
      suscripcionesRecientes,
      pagosRecientes,
    ] = await Promise.all([
      prisma.perfilProfesional.count(),
      prisma.perfilProfesional.count({ where: { estado: "PENDIENTE" } }),
      prisma.perfilProfesional.count({ where: { estado: "APROBADO" } }),
      prisma.usuario.count({ where: { rol: "CLIENTE" } }),
      prisma.resena.count(),
      prisma.mensaje.count(),
      prisma.resena.count({ where: { aprobada: false } }),
      prisma.suscripcion.count({ where: { estado: "ACTIVA" } }),
      prisma.pago.aggregate({ _sum: { monto: true }, where: { estadoPago: "approved" } }),
      prisma.usuario.count(),
      // Últimos 5 profesionales registrados
      prisma.perfilProfesional.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          estado: true,
          createdAt: true,
          usuario: { select: { nombre: true, email: true, imagen: true } },
          oficios: { select: { oficio: { select: { nombre: true } } } },
        },
      }),
      // Últimas 5 suscripciones
      prisma.suscripcion.findMany({
        take: 5,
        orderBy: { fechaInicio: "desc" },
        select: {
          id: true,
          plan: true,
          estado: true,
          fechaInicio: true,
          precioMensual: true,
          perfil: {
            select: { usuario: { select: { nombre: true } } },
          },
        },
      }),
      // Últimos 5 pagos
      prisma.pago.findMany({
        take: 5,
        orderBy: { fechaPago: "desc" },
        select: {
          id: true,
          monto: true,
          estadoPago: true,
          fechaPago: true,
          suscripcion: {
            select: {
              plan: true,
              perfil: { select: { usuario: { select: { nombre: true } } } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalProfesionales,
      profesionalesPendientes,
      profesionalesAprobados,
      totalClientes,
      totalResenas,
      totalMensajes,
      resenasPendientes,
      suscripcionesActivas,
      ingresosTotales: ingresosTotales._sum.monto || 0,
      totalUsuarios,
      actividadReciente: {
        profesionalesRecientes,
        suscripcionesRecientes,
        pagosRecientes,
      },
    });
  } catch (error) {
    return errorInterno(error, "obteniendo stats");
  }
}
