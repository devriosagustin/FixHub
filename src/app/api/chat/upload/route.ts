/**
 * API Route: POST /api/chat/upload
 *
 * Sube un archivo adjunto para el chat a Cloudinary.
 * Solo usuarios autenticados. Retorna { url, tipo, nombre }.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { subirImagen } from "@/lib/cloudinary";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const TIPOS_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function POST(request: NextRequest) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Se requiere un archivo" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "El archivo no puede superar los 10 MB" },
        { status: 400 }
      );
    }

    if (!TIPOS_PERMITIDOS.has(file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usá JPG, PNG, WebP, GIF o PDF." },
        { status: 400 }
      );
    }

    const subida = await subirImagen(file, `fixhub/chat/${session.user.id}`);

    return NextResponse.json(
      {
        adjunto: {
          url: subida.url,
          tipo: file.type,
          nombre: file.name || "adjunto",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorInterno(error, "subiendo adjunto de chat");
  }
}
