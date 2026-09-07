import { z } from "zod";

/**
 * URL http(s) solamente -- rechaza "javascript:", "data:", etc.
 *
 * Se usa en cualquier campo que termine renderizado como `src`/`href`
 * en el frontend (imagen, link, iframe) y venga de un body que el
 * cliente controla. Sin este chequeo, cualquier usuario podía guardar
 * ahí una URL con otro esquema y quedaba embebida/clickeable para
 * quien viera ese contenido -- ver AGENTS.md, backlog de seguridad.
 * Originalmente vivía duplicado en profesionales/[id]/route.ts
 * (sitioWeb/videoUrl); se extrajo acá para reusarlo en otros campos
 * del mismo tipo (ej. fotoUrl de reseñas).
 */
export const urlHttpSchema = z
  .string()
  .url("URL inválida")
  .refine((v) => /^https?:\/\//i.test(v), "La URL debe empezar con http:// o https://");
