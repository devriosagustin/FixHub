/**
 * API Route: POST /api/auth/reset-password
 *
 * Valida el token de reseteo y establece la nueva contraseña.
 * Body: { token, password }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { errorInterno } from "@/lib/api-auth";

const schema = z.object({
  token: z.string().min(10, "Token inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg =
        parsed.error.issues[0]?.message === "La contraseña debe tener al menos 6 caracteres"
          ? parsed.error.issues[0].message
          : "Token inválido";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const usuario = await prisma.usuario.findUnique({
      where: { resetToken: token },
    });

    if (!usuario || !usuario.resetTokenExpiry) {
      return NextResponse.json(
        { error: "El enlace es inválido o ya fue utilizado." },
        { status: 400 }
      );
    }

    if (usuario.resetTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: "El enlace ha expirado. Solicitá uno nuevo." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      mensaje: "Contraseña actualizada correctamente. Ya podés iniciar sesión.",
    });
  } catch (err) {
    return errorInterno(err, "en reset-password");
  }
}
