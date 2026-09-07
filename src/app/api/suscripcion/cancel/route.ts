/**
 * API Route: POST /api/suscripcion/cancel
 * 
 * Cancela la suscripción activa del profesional.
 * La suscripción se mantiene hasta la fecha de fin (no se reembolsa).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelarPreapproval } from "@/lib/mercadopago";

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;

    // Buscar el perfil profesional
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!perfil) {
      return NextResponse.json(
        { error: "No tienes un perfil profesional" },
        { status: 404 }
      );
    }

    // Buscar la suscripción activa
    const suscripcion = await prisma.suscripcion.findUnique({
      where: { perfilId: perfil.id },
    });

    if (!suscripcion || suscripcion.estado !== "ACTIVA") {
      return NextResponse.json(
        { error: "No tienes una suscripción activa" },
        { status: 400 }
      );
    }

    // Si hay un preapproval real de MercadoPago detrás, cancelarlo ahí
    // también: si no, MercadoPago sigue cobrando el mes que viene aunque
    // en fixhub la suscripción ya figure como cancelada.
    let avisoMercadoPago: string | undefined;
    if (suscripcion.mercadopagoPreapprovalId) {
      try {
        await cancelarPreapproval(suscripcion.mercadopagoPreapprovalId);
      } catch (mpErr) {
        console.error(
          "Error al cancelar el preapproval en MercadoPago:",
          suscripcion.mercadopagoPreapprovalId,
          mpErr
        );
        avisoMercadoPago =
          " No pudimos confirmar la cancelación del cobro automático con MercadoPago; " +
          "si seguís viendo un cargo el próximo mes, contactanos.";
      }
    }

    // Cancelar la suscripción (se mantiene hasta la fecha de fin)
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        estado: "CANCELADA",
        renovacionAuto: false,
      },
    });

    return NextResponse.json({
      mensaje:
        "Suscripción cancelada. Se mantendrá activa hasta el " +
        (suscripcion.fechaFin
          ? new Date(suscripcion.fechaFin).toLocaleDateString("es-AR")
          : "fin del período") +
        "." +
        (avisoMercadoPago || ""),
    });
  } catch (err) {
    console.error("Error al cancelar suscripción:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
