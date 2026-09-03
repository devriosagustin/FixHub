import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { subirImagen } from "@/lib/cloudinary";

// POST /api/uploads - Subir imagen a Cloudinary
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const carpeta = (formData.get("carpeta") as string) || "fixhub";

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    // Validar tipo de archivo
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!tiposPermitidos.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo: JPG, PNG, WebP, GIF, PDF" },
        { status: 400 }
      );
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo no puede superar 10MB" },
        { status: 400 }
      );
    }

    const resultado = await subirImagen(file, carpeta);

    return NextResponse.json({
      url: resultado.url,
      publicId: resultado.publicId,
    });
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
