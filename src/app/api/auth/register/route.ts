import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { enviarEmail } from "@/lib/resend";

const schemaRegistro = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const datos = schemaRegistro.parse(body);

    const existente = await prisma.usuario.findUnique({
      where: { email: datos.email },
    });

    if (existente) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(datos.password, 12);

    const usuario = await prisma.usuario.create({
      data: {
        email: datos.email,
        nombre: datos.nombre,
        password: passwordHash,
        rol: "CLIENTE",
      },
    });
    // Email de bienvenida (no crítico: no bloquea el registro)
    enviarEmail({
      to: usuario.email,
      subject: "¡Bienvenido a fixhub!",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b">
          <h2 style="color:#0f172a">¡Bienvenido, ${usuario.nombre}!</h2>
          <p style="font-size:14px;line-height:1.6">
            Gracias por unirte a fixhub. Encontrá profesionales de confianza
            para tus proyectos o registrá tu perfil para ofrecer tus servicios.
          </p>
          <div style="margin-top:24px">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/busqueda"
               style="background:#f97316;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
              Explorar profesionales
            </a>
          </div>
        </div>
      `,
      text: `¡Bienvenido, ${usuario.nombre}! Gracias por unirte a fixhub.`,
    });

    return NextResponse.json(
      {
        mensaje: "Usuario creado exitosamente",
        usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
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
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
