/**
 * API Route: POST /api/trabajos/fotos
 *
 * Sube fotos para adjuntar a un trabajo (antes de publicarlo).
 * Solo clientes autenticados. Retorna { fotos: string[] } con las URLs
 * en Cloudinary, para incluir luego en el body de POST /api/trabajos.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { subirImagen } from "@/lib/cloudinary";

const MAX_FOTOS = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  try {
    const resultado = await requireAuth(
      ["CLIENTE", "ADMIN"],
      "Solo los clientes pueden subir fotos de trabajos"
    );
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No se proporcionaron archivos" }, { status: 400 });
    }

    if (files.length > MAX_FOTOS) {
      return NextResponse.json(
        { error: `Podés subir hasta ${MAX_FOTOS} fotos por trabajo` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: "Cada foto no puede superar los 10 MB" },
          { status: 400 }
        );
      }
      if (!TIPOS_PERMITIDOS.has(file.type)) {
        return NextResponse.json(
          { error: "Formato no permitido. Usá JPG, PNG, WebP o GIF." },
          { status: 400 }
        );
      }
    }

    const fotos: string[] = [];
    for (const file of files) {
      const subida = await subirImagen(file, `fixhub/trabajos/${session.user.id}`);
      fotos.push(subida.url);
    }

    return NextResponse.json({ fotos }, { status: 201 });
  } catch (error) {
    return errorInterno(error, "subiendo fotos de trabajo");
  }
}
