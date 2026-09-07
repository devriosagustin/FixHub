import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ProfesionalProfileClient } from "./ProfileClient";
import { esSuscripcionPagaActiva } from "@/lib/suscripcion";

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
      suscripcion: { select: { plan: true, estado: true, fechaFin: true } },
    },
  });

  if (!perfil || perfil.estado !== "APROBADO") {
    notFound();
  }

  const sesionVisitante = await auth();

  // Profesionales sin suscripción paga activa no son contactables: lo
  // más probable es que ya no estén usando fixhub activamente, así que
  // en vez de mostrar el perfil (con botones de WhatsApp/chat que
  // probablemente no lleven a ningún lado) se redirige ANTES de
  // renderizar nada. Un admin puede seguir viendo cualquier perfil
  // (moderación). Ver AGENTS.md, backlog resuelto de esta sesión.
  const puedeVerse =
    esSuscripcionPagaActiva(perfil.suscripcion) || sesionVisitante?.user?.rol === "ADMIN";

  if (!puedeVerse) {
    // El propio profesional viendo su perfil vencido/sin plan pago va
    // directo a elegir un plan; cualquier otra persona (logueada como
    // otro usuario, o anónima) va a una página que no promete que se
    // lo pueda contactar y lo redirige a buscar otro profesional.
    if (sesionVisitante?.user?.id === perfil.userId) {
      redirect("/planes?motivo=perfil-inactivo");
    }
    redirect("/perfil-no-disponible");
  }

  // Incrementar visitas (contador legado, se sigue usando en otros lados)
  prisma.perfilProfesional.update({
    where: { id },
    data: { visitas: { increment: 1 } },
  }).catch(() => {});

  // Registrar el evento para el dashboard de métricas del profesional.
  // Se excluye al propio dueño del perfil viéndose a sí mismo (no cuenta
  // como interacción real). No hay forma de excluir a un visitante
  // anónimo que resulta ser el dueño sin sesión iniciada -- limitación
  // conocida, documentada en AGENTS.md.
  if (sesionVisitante?.user?.id !== perfil.userId) {
    prisma.interaccionPerfil
      .create({
        data: {
          perfilId: id,
          tipo: "VISTA_PERFIL",
          usuarioId: sesionVisitante?.user?.id ?? null,
        },
      })
      .catch(() => {});
  }

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
