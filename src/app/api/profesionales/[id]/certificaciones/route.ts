import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subirImagen, eliminarImagen } from "@/lib/cloudinary";
import { getPlanById } from "@/lib/plans";

// POST /api/profesionales/[id]/certificaciones - Subir certificación
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id },
      select: {
        userId: true,
        suscripcion: { select: { plan: true } },
      },
    });

    if (!perfil || perfil.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verificar límite de certificaciones según el plan
    const planNombre = perfil.suscripcion?.plan || "GRATUITO";
    const limiteCert = getPlanById(planNombre as any).limites.certificaciones;
    const certCount = await prisma.certificacion.count({ where: { perfilId: id } });

    if (limiteCert !== -1 && certCount >= limiteCert) {
      return NextResponse.json(
        {
          error: `Alcanzaste el límite de ${limiteCert} certificaciones. ${planNombre === "GRATUITO" ? "Actualizá a un plan superior para subir más." : ""}`,
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const nombre = formData.get("nombre") as string;

    if (!file || !nombre) {
      return NextResponse.json({ error: "Archivo y nombre son requeridos" }, { status: 400 });
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!tiposPermitidos.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido (JPG, PNG, WebP, PDF)" }, { status: 400 });
    }

    const resultado = await subirImagen(file, `fixhub/certificaciones/${id}`);

    const certificacion = await prisma.certificacion.create({
      data: {
        perfilId: id,
        nombre,
        url: resultado.url,
        tipo: file.type === "application/pdf" ? "pdf" : "imagen",
      },
    });

    return NextResponse.json({ certificacion }, { status: 201 });
  } catch (error) {
    console.error("Error subiendo certificación:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/profesionales/[id]/certificaciones?id=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const certId = searchParams.get("certId");

    if (!certId) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!perfil || perfil.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const cert = await prisma.certificacion.findUnique({ where: { id: certId } });
    if (!cert || cert.perfilId !== id) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    try {
      const urlParts = cert.url.split("/");
      const uploadIndex = urlParts.indexOf("upload");
      if (uploadIndex !== -1) {
        const publicId = urlParts.slice(uploadIndex + 1).join("/").replace(/\.[^.]+$/, "");
        await eliminarImagen(publicId);
      }
    } catch {}

    await prisma.certificacion.delete({ where: { id: certId } });

    return NextResponse.json({ mensaje: "Certificación eliminada" });
  } catch (error) {
    console.error("Error eliminando certificación:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
