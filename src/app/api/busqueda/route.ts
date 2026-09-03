import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fórmula de Haversine para calcular distancia entre dos puntos en km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/busqueda - Buscar profesionales con filtros y geolocalización
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filtros
    const oficio = searchParams.get("oficio");
    const oficios = searchParams.get("oficios")?.split(",").filter(Boolean);
    const ciudad = searchParams.get("ciudad");
    const puntuacionMin = searchParams.get("puntuacion");
    const precioMin = searchParams.get("precioMin");
    const precioMax = searchParams.get("precioMax");
    const buscar = searchParams.get("q"); // Búsqueda por texto libre

    // Geolocalización del cliente
    const clientLat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null;
    const clientLng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null;
    const radioMax = searchParams.get("radio") ? parseInt(searchParams.get("radio")!) : 50; // Default 50km

    // Paginación y ordenamiento
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const orden = searchParams.get("orden") || "relevancia"; // cercania | puntuacion | resenas | recientes

    // Construir filtros Where
    const where: Record<string, unknown> = {
      estado: "APROBADO",
    };

    // Filtro por ciudad
    if (ciudad) {
      where.ciudad = { contains: ciudad, mode: "insensitive" };
    }

    // Filtro por oficio(s)
    const oficiosArray = oficios && oficios.length > 0 ? oficios : oficio ? [oficio] : [];
    if (oficiosArray.length > 0) {
      where.oficios = {
        some: {
          oficio: { slug: { in: oficiosArray } },
        },
      };
    }

    // Filtro por puntuación mínima
    if (puntuacionMin) {
      where.resenas = {
        some: {
          aprobada: true,
          puntuacion: { gte: parseInt(puntuacionMin) },
        },
      };
    }

    // Filtro por precio
    if (precioMin || precioMax) {
      where.precioPorHora = {};
      if (precioMin) (where.precioPorHora as Record<string, number>).gte = parseFloat(precioMin);
      if (precioMax) (where.precioPorHora as Record<string, number>).lte = parseFloat(precioMax);
    }

    // Búsqueda por texto en título, descripción, nombre de usuario
    if (buscar) {
      where.OR = [
        { titulo: { contains: buscar, mode: "insensitive" } },
        { descripcion: { contains: buscar, mode: "insensitive" } },
        { usuario: { nombre: { contains: buscar, mode: "insensitive" } } },
      ];
    }

    // Obtener todos los perfiles que coincidan (sin paginación aún, para calcular cercanía)
    const perfilesRaw = await prisma.perfilProfesional.findMany({
      where,
      include: {
        usuario: { select: { nombre: true, imagen: true } },
        oficios: { include: { oficio: true } },
        resenas: {
          where: { aprobada: true },
          select: { puntuacion: true },
        },
        suscripcion: { select: { plan: true } },
      },
    });

    // Calcular distancia si el cliente tiene ubicación
    interface PerfilResultado {
      id: string;
      titulo: string | null;
      descripcion: string | null;
      ciudad: string | null;
      barrio: string | null;
      latitud: number | null;
      longitud: number | null;
      tipoPrecio: string;
      precioPorHora: number | null;
      verificado: boolean;
      destacado: boolean;
      usuario: { nombre: string; imagen: string | null };
      oficios: { oficio: { nombre: string; icono: string | null } }[];
      promedioEstrellas: number;
      totalResenas: number;
      plan: string;
      distancia: number | null;
    }

    const perfilesConDistancia: PerfilResultado[] = perfilesRaw.map((perfil) => {
      let distancia: number | null = null;

      if (clientLat != null && clientLng != null && perfil.latitud != null && perfil.longitud != null) {
        distancia = Math.round(haversine(clientLat, clientLng, perfil.latitud, perfil.longitud) * 10) / 10;
      }

      // Filtrar por radio máximo
      if (distancia !== null && distancia > radioMax) return null as unknown as PerfilResultado;

      // Calcular promedio de estrellas
      const totalResenas = perfil.resenas.length;
      const promedio =
        totalResenas > 0
          ? Math.round((perfil.resenas.reduce((s, r) => s + r.puntuacion, 0) / totalResenas) * 10) / 10
          : 0;

      return {
        id: perfil.id,
        titulo: perfil.titulo,
        descripcion: perfil.descripcion,
        ciudad: perfil.ciudad,
        barrio: perfil.barrio,
        latitud: perfil.latitud,
        longitud: perfil.longitud,
        tipoPrecio: perfil.tipoPrecio,
        precioPorHora: perfil.precioPorHora,
        verificado: perfil.verificado,
        destacado: perfil.destacado,
        usuario: perfil.usuario,
        oficios: perfil.oficios,
        promedioEstrellas: promedio,
        totalResenas,
        plan: perfil.suscripcion?.plan || "GRATUITO",
        distancia,
      };
    }).filter((p): p is PerfilResultado => p !== null);

    // Ordenamiento
    perfilesConDistancia.sort((a, b) => {
      // Los premium siempre primero
      if (a.plan === "PREMIUM" && b.plan !== "PREMIUM") return -1;
      if (b.plan === "PREMIUM" && a.plan !== "PREMIUM") return 1;

      // Los destacados después
      if (a.destacado && !b.destacado) return -1;
      if (b.destacado && !a.destacado) return 1;

      // Los verificados después
      if (a.verificado && !b.verificado) return -1;
      if (b.verificado && !a.verificado) return 1;

      switch (orden) {
        case "cercania":
          if (a.distancia != null && b.distancia != null) return a.distancia - b.distancia;
          if (a.distancia != null) return -1;
          if (b.distancia != null) return 1;
          return 0;
        case "puntuacion":
          return b.promedioEstrellas - a.promedioEstrellas;
        case "resenas":
          return b.totalResenas - a.totalResenas;
        case "recientes":
          return 0; // Ya vienen ordenados por createdAt desc del backend
        default:
          // Relevancia: combinación de puntuación y reseñas
          return b.promedioEstrellas * b.totalResenas - a.promedioEstrellas * a.totalResenas;
      }
    });

    const total = perfilesConDistancia.length;
    const start = (page - 1) * limit;
    const paginados = perfilesConDistancia.slice(start, start + limit);

    return NextResponse.json({
      resultados: paginados,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en búsqueda:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
