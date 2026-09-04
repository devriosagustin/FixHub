import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { subirImagen } from "@/lib/cloudinary";

// POST /api/profesionales/[id]/documentos - Subir DNI (frente y dorso)
export async function POST(
  request: NextRequest,
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

    const formData = await request.formData();
    const frente = formData.get("frente") as File | null;
    const dorso = formData.get("dorso") as File | null;

    if (!frente || !dorso) {
      return NextResponse.json({ error: "Se necesitan ambas fotos del DNI (frente y dorso)" }, { status: 400 });
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    for (const file of [frente, dorso]) {
      if (!tiposPermitidos.includes(file.type)) {
        return NextResponse.json({ error: "Solo se permiten JPG, PNG o WebP para el DNI" }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Los archivos no pueden superar 10MB" }, { status: 400 });
      }
    }

    // Subir ambas imágenes
    const [frenteResult, dorsoResult] = await Promise.all([
      subirImagen(frente, `fixhub/dni/${id}`),
      subirImagen(dorso, `fixhub/dni/${id}`),
    ]);

    // Eliminar documentos anteriores si existen
    await prisma.documentoVerificacion.deleteMany({
      where: { perfilId: id, usuarioId: session.user.id },
    });

    // Crear registros de documentos
    await prisma.documentoVerificacion.createMany({
      data: [
        {
          usuarioId: session.user.id,
          perfilId: id,
          tipo: "dni_frente",
          url: frenteResult.url,
          estado: "PENDIENTE",
        },
        {
          usuarioId: session.user.id,
          perfilId: id,
          tipo: "dni_dorso",
          url: dorsoResult.url,
          estado: "PENDIENTE",
        },
      ],
    });

    return NextResponse.json({ mensaje: "Documentos DNI subidos correctamente" }, { status: 201 });
  } catch (error) {
    return errorInterno(error, "subiendo DNI");
  }
}
