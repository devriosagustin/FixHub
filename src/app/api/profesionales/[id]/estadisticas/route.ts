import { NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { obtenerMetricasPerfil } from "@/lib/metricas";

// GET /api/profesionales/[id]/estadisticas - Ver mis estadísticas (propietario)
export async function GET(
  _request: Request,
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

    const [
      perfilStats,
      totalResenas,
      resenasPromedio,
      totalMensajes,
      conversaciones,
      fotosCount,
      certCount,
      interacciones,
    ] = await Promise.all([
      prisma.perfilProfesional.findUnique({
        where: { id },
        select: { visitas: true, contactos: true },
      }),
      prisma.resena.count({ where: { perfilId: id } }),
      prisma.resena.aggregate({
        where: { perfilId: id },
        _avg: { puntuacion: true },
      }),
      prisma.mensaje.count({
        where: { conversacion: { profesionalId: id } },
      }),
      prisma.conversacion.count({ where: { profesionalId: id } }),
      prisma.fotoGaleria.count({ where: { perfilId: id } }),
      prisma.certificacion.count({ where: { perfilId: id } }),
      obtenerMetricasPerfil(id),
    ]);

    const suscripcion = await prisma.suscripcion.findUnique({
      where: { perfilId: id },
      select: { plan: true, fechaFin: true },
    });

    return NextResponse.json({
      visitas: perfilStats?.visitas || 0,
      contactos: perfilStats?.contactos || 0,
      totalResenas,
      promedioEstrellas: resenasPromedio._avg.puntuacion
        ? Math.round(resenasPromedio._avg.puntuacion * 10) / 10
        : 0,
      totalMensajes,
      totalConversaciones: conversaciones,
      totalFotos: fotosCount,
      totalCertificaciones: certCount,
      suscripcion,
      interacciones,
    });
  } catch (error) {
    return errorInterno(error, "obteniendo estadísticas");
  }
}
