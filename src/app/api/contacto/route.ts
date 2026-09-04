/**
 * API Route: POST /api/contacto
 *
 * Recibe el formulario de contacto y lo envía por email al soporte.
 */

import { NextRequest, NextResponse } from "next/server";
import { enviarEmail, resendConfigurado } from "@/lib/resend";
import { z } from "zod";
import { errorInterno } from "@/lib/api-auth";

const ContactoSchema = z.object({
  nombre: z.string().min(2, "El nombre es requerido").max(100),
  email: z.string().email("Email no válido"),
  asunto: z.string().min(2, "El asunto es requerido").max(150),
  mensaje: z.string().min(10, "El mensaje debe tener al menos 10 caracteres").max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ContactoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const { nombre, email, asunto, mensaje } = parsed.data;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b">
        <h2 style="color:#0f172a">Nuevo mensaje de contacto</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#64748b">Nombre</td><td style="padding:6px 0"><strong>${nombre}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0"><strong>${email}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Asunto</td><td style="padding:6px 0"><strong>${asunto}</strong></td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
        <p style="white-space:pre-wrap;font-size:14px;line-height:1.6">${mensaje}</p>
      </div>
    `;

    const resultado = await enviarEmail({
      to: process.env.CONTACTO_EMAIL || "soporte@fixhub.com",
      subject: `[Contacto] ${asunto}`,
      html,
      text: `Nuevo mensaje de contacto.\n\nNombre: ${nombre}\nEmail: ${email}\nAsunto: ${asunto}\n\n${mensaje}`,
      replyTo: email,
    });

    if (!resultado.success) {
      // Si no está configurado Resend, respondemos con un aviso seguro
      return NextResponse.json(
        {
          mensaje: "Mensaje recibido.",
          enviado: false,
          aviso: resendConfigurado() ? "Error al enviar" : undefined,
        },
        { status: resendConfigurado() ? 500 : 200 }
      );
    }

    return NextResponse.json({ mensaje: "Mensaje enviado", enviado: true });
  } catch (err) {
    return errorInterno(err, "en /api/contacto");
  }
}
