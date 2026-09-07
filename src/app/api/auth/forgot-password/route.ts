/**
 * API Route: POST /api/auth/forgot-password
 *
 * Genera un token de reseteo de contraseña y lo envía por email.
 * Body: { email }
 *
 * Por seguridad, siempre responde 200 (no revela si el email existe).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/resend";
import crypto from "crypto";
import { z } from "zod";
import { errorInterno } from "@/lib/api-auth";
import { rateLimit, obtenerIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

export async function POST(request: NextRequest) {
  try {
    // Frena spam de emails de reseteo (a costa de Resend, y de la
    // bandeja de entrada de la persona apuntada): 5 cada 10 min por IP.
    const limite = rateLimit(`forgot-password:${obtenerIp(request)}`, {
      maxIntentos: 5,
      ventanaMs: 10 * 60 * 1000,
    });
    if (!limite.permitido) {
      return NextResponse.json(
        { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const { email } = parsed.data;
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    // Respuesta genérica para no revelar si el email existe
    if (!usuario || !usuario.password) {
      return NextResponse.json({
        mensaje:
          "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
      });
    }

    // Generar token seguro (32 bytes -> hex)
    const token = crypto.randomBytes(32).toString("hex");
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 1);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { resetToken: token, resetTokenExpiry: expiracion },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const enlace = `${baseUrl}/reset-password?token=${token}`;

    await enviarEmail({
      to: usuario.email,
      subject: "Restablecer tu contraseña - fixhub",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b">
          <h2 style="color:#0f172a">Restablecer contraseña</h2>
          <p style="font-size:14px;line-height:1.6">
            Hola ${usuario.nombre}, recibimos una solicitud para restablecer tu contraseña.
            El enlace es válido por <strong>1 hora</strong>.
          </p>
          <div style="margin-top:24px">
            <a href="${enlace}"
               style="background:#f97316;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
              Restablecer contraseña
            </a>
          </div>
          <p style="margin-top:24px;font-size:12px;color:#64748b">
            Si no solicitaste este cambio, podés ignorar este email.
          </p>
        </div>
      `,
      text: `Hola ${usuario.nombre}, restablecé tu contraseña en el siguiente enlace (válido 1 hora): ${enlace}`,
    });

    return NextResponse.json({
      mensaje:
        "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
    });
  } catch (err) {
    return errorInterno(err, "en forgot-password");
  }
}
