/**
 * Definición de planes de suscripción
 * 
 * Define las características, límites y precios de cada plan.
 * Se usa tanto en el frontend (página de planes) como en el backend (feature gating).
 */

export type PlanId = "GRATUITO" | "PROFESIONAL" | "PREMIUM";

export interface PlanFeature {
  texto: string;
  incluido: boolean;
}

export interface Plan {
  id: PlanId;
  nombre: string;
  precio: number | null; // null = gratuito
  precioId: string | null; // ID del plan en MercadoPago
  descripcion: string;
  caracteristicas: PlanFeature[];
  limites: {
    galeriaFotos: number; // -1 = ilimitado
    certificaciones: number;
    fotosPorGaleria: number;
    destacado: boolean;
    fijado: boolean;
    prioridadBusqueda: boolean;
    badgeVerificado: boolean;
    estadisticas: boolean;
    chatIlimitado: boolean;
  };
  popular: boolean;
  color: string;
}

/**
 * Planes de suscripción de fixhub
 */
export const PLANES: Record<PlanId, Plan> = {
  GRATUITO: {
    id: "GRATUITO",
    nombre: "Gratuito",
    precio: null,
    precioId: null,
    descripcion: "Para empezar a ofrecer tus servicios",
    caracteristicas: [
      { texto: "Perfil profesional verificado", incluido: true },
      { texto: "Hasta 5 fotos en galería", incluido: true },
      { texto: "Hasta 2 certificaciones", incluido: true },
      { texto: "Chat con clientes", incluido: true },
      { texto: "Aparecer en búsquedas", incluido: true },
      { texto: "Reseñas de clientes", incluido: true },
      { texto: "Foto destacada en búsquedas", incluido: false },
      { texto: "Posición fijada arriba", incluido: false },
      { texto: "Estadísticas detalladas", incluido: false },
      { texto: "Soporte prioritario", incluido: false },
    ],
    limites: {
      galeriaFotos: 5,
      certificaciones: 2,
      fotosPorGaleria: 5,
      destacado: false,
      fijado: false,
      prioridadBusqueda: false,
      badgeVerificado: false,
      estadisticas: false,
      chatIlimitado: true,
    },
    popular: false,
    color: "border-border",
  },
  PROFESIONAL: {
    id: "PROFESIONAL",
    nombre: "Profesional",
    precio: 4999,
    precioId: null, // Se configura con el ID de MercadoPago
    descripcion: "Para profesionales que quieren crecer",
    caracteristicas: [
      { texto: "Perfil profesional verificado", incluido: true },
      { texto: "Hasta 30 fotos en galería", incluido: true },
      { texto: "Hasta 10 certificaciones", incluido: true },
      { texto: "Chat con clientes", incluido: true },
      { texto: "Aparecer en búsquedas", incluido: true },
      { texto: "Reseñas de clientes", incluido: true },
      { texto: "Foto destacada en búsquedas", incluido: true },
      { texto: "Posición fijada arriba", incluido: false },
      { texto: "Estadísticas detalladas", incluido: true },
      { texto: "Soporte prioritario", incluido: false },
    ],
    limites: {
      galeriaFotos: 30,
      certificaciones: 10,
      fotosPorGaleria: 30,
      destacado: true,
      fijado: false,
      prioridadBusqueda: true,
      badgeVerificado: false,
      estadisticas: true,
      chatIlimitado: true,
    },
    popular: true,
    color: "border-orange",
  },
  PREMIUM: {
    id: "PREMIUM",
    nombre: "Premium",
    precio: 9999,
    precioId: null, // Se configura con el ID de MercadoPago
    descripcion: "Para profesionales que quieren todo",
    caracteristicas: [
      { texto: "Perfil profesional verificado", incluido: true },
      { texto: "Galería ilimitada", incluido: true },
      { texto: "Certificaciones ilimitadas", incluido: true },
      { texto: "Chat con clientes", incluido: true },
      { texto: "Aparecer en búsquedas", incluido: true },
      { texto: "Reseñas de clientes", incluido: true },
      { texto: "Foto destacada en búsquedas", incluido: true },
      { texto: "Posición fijada arriba", incluido: true },
      { texto: "Estadísticas detalladas", incluido: true },
      { texto: "Soporte prioritario", incluido: true },
    ],
    limites: {
      galeriaFotos: -1,
      certificaciones: -1,
      fotosPorGaleria: -1,
      destacado: true,
      fijado: true,
      prioridadBusqueda: true,
      badgeVerificado: true,
      estadisticas: true,
      chatIlimitado: true,
    },
    popular: false,
    color: "border-navy",
  },
};

/**
 * Obtener el plan por defecto para nuevos profesionales
 */
export function getPlanDefault(): Plan {
  return PLANES.GRATUITO;
}

/**
 * Obtener un plan por su ID
 */
export function getPlanById(id: PlanId): Plan {
  return PLANES[id] || PLANES.GRATUITO;
}

/**
 * Formatear precio a moneda argentina
 */
export function formatearPrecio(precio: number | null): string {
  if (precio === null || precio === 0) return "Gratis";
  return `$${precio.toLocaleString("es-AR")}`;
}

/**
 * Obtener el límite de un recurso según el plan
 * Retorna -1 si es ilimitado
 */
export function getLimite(plan: PlanId, recurso: keyof Plan["limites"]): number {
  return PLANES[plan].limites[recurso] as number;
}

/**
 * Verificar si un plan tiene acceso a una feature
 */
export function tieneAcceso(plan: PlanId, recurso: keyof Plan["limites"]): boolean {
  const valor = PLANES[plan].limites[recurso];
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor !== 0;
  return false;
}
