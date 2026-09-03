import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProfesionalProfileClient } from "./ProfileClient";

// Generar metadata dinámica para SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const perfil = await prisma.perfilProfesional.findUnique({
    where: { id },
    include: { usuario: { select: { nombre: true } } },
  });

  if (!perfil || perfil.estado !== "APROBADO") {
    return { title: "Profesional no encontrado" };
  }

  return {
    title: `${perfil.usuario.nombre} - ${perfil.titulo || "Profesional"} | fixhub`,
    description: perfil.descripcion?.slice(0, 160) || `Perfil de ${perfil.usuario.nombre} en fixhub`,
  };
}

// Server component: obtiene datos del profesional
export default async function ProfesionalProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const perfil = await prisma.perfilProfesional.findUnique({
    where: { id },
    include: {
      usuario: { select: { id: true, nombre: true, imagen: true } },
      oficios: { include: { oficio: true } },
      galeriaFotos: { orderBy: { orden: "asc" } },
      certificaciones: true,
      horarios: { orderBy: { diaSemana: "asc" } },
      resenas: {
        where: { aprobada: true },
        include: {
          cliente: { select: { id: true, nombre: true, imagen: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      suscripcion: { select: { plan: true } },
    },
  });

  if (!perfil || perfil.estado !== "APROBADO") {
    notFound();
  }

  // Incrementar visitas
  prisma.perfilProfesional.update({
    where: { id },
    data: { visitas: { increment: 1 } },
  }).catch(() => {});

  // Calcular promedio
  const promedio =
    perfil.resenas.length > 0
      ? Math.round(
          (perfil.resenas.reduce((s, r) => s + r.puntuacion, 0) / perfil.resenas.length) * 10
        ) / 10
      : 0;

  return (
    <ProfesionalProfileClient
      perfil={JSON.parse(JSON.stringify(perfil))}
      promedioEstrellas={promedio}
      totalResenas={perfil.resenas.length}
    />
  );
}
