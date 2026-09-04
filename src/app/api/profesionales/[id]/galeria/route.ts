import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { subirImagen, eliminarImagen } from "@/lib/cloudinary";

// POST /api/profesionales/[id]/galeria - Subir fotos a galería
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const { id } = await params;

    // Verificar propiedad del perfil
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id },
      include: { galeriaFotos: true, suscripcion: true },
    });

    if (!perfil || perfil.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verificar límite según plan
    const esPremium = perfil.suscripcion?.plan === "PROFESIONAL" || perfil.suscripcion?.plan === "PREMIUM";
    const limite = esPremium ? 20 : 3;
    const fotosActuales = perfil.galeriaFotos.length;

    if (fotosActuales >= limite) {
      return NextResponse.json(
        { error: `Alcanzaste el límite de ${limite} fotos. ${!esPremium ? "Upgrade a Plan Profesional para más." : ""}` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No se proporcionaron archivos" }, { status: 400 });
    }

    const fotosSubidas: { id: string; perfilId: string; url: string; descripcion: string | null; orden: number; createdAt: Date }[] = [];
    for (const file of files) {
      if (fotosActuales + fotosSubidas.length >= limite) break;

      const resultado = await subirImagen(file, `fixhub/galeria/${id}`);
      const foto = await prisma.fotoGaleria.create({
        data: {
          perfilId: id,
          url: resultado.url,
          descripcion: file.name,
          orden: fotosActuales + fotosSubidas.length,
        },
      });
      fotosSubidas.push(foto);
    }

    return NextResponse.json({ fotos: fotosSubidas }, { status: 201 });
  } catch (error) {
    return errorInterno(error, "subiendo galería");
  }
}

// DELETE /api/profesionales/[id]/galeria?id=xxx - Eliminar foto de galería
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fotoId = searchParams.get("fotoId");

    if (!fotoId) {
      return NextResponse.json({ error: "ID de foto requerido" }, { status: 400 });
    }

    // Verificar propiedad
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!perfil || perfil.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const foto = await prisma.fotoGaleria.findUnique({ where: { id: fotoId } });
    if (!foto || foto.perfilId !== id) {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
    }

    // Eliminar de Cloudinary y de la BD
    try {
      // Extraer publicId de la URL de Cloudinary
      const urlParts = foto.url.split("/");
      const uploadIndex = urlParts.indexOf("upload");
      if (uploadIndex !== -1) {
        const publicId = urlParts.slice(uploadIndex + 1).join("/").replace(/\.[^.]+$/, "");
        await eliminarImagen(publicId);
      }
    } catch {
      // Si falla la eliminación en Cloudinary, igual eliminar de la BD
    }

    await prisma.fotoGaleria.delete({ where: { id: fotoId } });

    return NextResponse.json({ mensaje: "Foto eliminada" });
  } catch (error) {
    return errorInterno(error, "eliminando foto");
  }
}
