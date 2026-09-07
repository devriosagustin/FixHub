/**
 * API Route: POST /api/perfiles/[id]/interacciones
 *
 * Registra un evento de interacción con un perfil profesional, para el
 * dashboard de métricas del profesional (ver src/lib/metricas.ts).
 *
 * Es la única de las 3 métricas (vista de perfil, chat iniciado, click
 * en WhatsApp) que no tiene ya un request de servidor propio del que
 * "colgarse": el botón de WhatsApp es un <a href="https://wa.me/..."> que
 * navega directo, sin pasar por el backend. Por eso esta ruta existe
 * específicamente para ese caso — el frontend la llama con
 * fetch(..., {keepalive:true}) al hacer click, sin esperar la respuesta.
 *
 * Por eso mismo, es una ruta PÚBLICA (el perfil también es público, sin
 * sesión): no usa requireAuth. Para no convertirla en una forma barata
 * de "inflar" otras métricas, solo acepta el tipo CLICK_WHATSAPP — las
 * otras dos (VISTA_PERFIL, CHAT_INICIADO) se registran server-side,
 * donde ya se sabe con certeza que ocurrieron.
 *
 * No tiene rate-limiting propio todavía (ver AGENTS.md, backlog de
 * seguridad) — alguien podría hacer POST repetidos a mano para inflar
 * su propio contador de clicks. Impacto acotado (es solo una métrica
 * informativa del propio profesional, no afecta cobros ni acceso), pero
 * queda pendiente si se vuelve un problema real.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorInterno } from "@/lib/api-auth";

const bodySchema = z.object({
  tipo: z.literal("CLICK_WHATSAPP"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: perfilId } = await params;

    const parseo = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parseo.success) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id: perfilId },
      select: { id: true, estado: true, userId: true },
    });

    if (!perfil || perfil.estado !== "APROBADO") {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    const session = await auth();

    // No contar al propio profesional haciendo click en su botón (si
    // está logueado; a un visitante anónimo que resulte ser el dueño no
    // hay forma de detectarlo -- limitación conocida).
    if (session?.user?.id !== perfil.userId) {
      await prisma.interaccionPerfil.create({
        data: {
          perfilId,
          tipo: "CLICK_WHATSAPP",
          usuarioId: session?.user?.id ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorInterno(err, "registrando interacción de perfil");
  }
}
