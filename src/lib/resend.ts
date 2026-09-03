/**
 * resend.ts - Utilidades de envío de emails con Resend.
 *
 * Para evitar fallos en entornos sin una API key real, si RESEND_API_KEY
 * no está configurada (o es el placeholder por defecto), las funciones
 * de envío devuelven { success: false, error: "no_configurado" } sin
 * intentar llamar al servicio.
 */

import { Resend } from "resend";

const API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "fixhub <noreply@fixhub.com>";

const RESEND_CONFIGURADA =
  API_KEY.length > 0 && !API_KEY.startsWith("re_tu-api-key");

let resend: Resend | null = null;
if (RESEND_CONFIGURADA) {
  resend = new Resend(API_KEY);
}

interface EnviarParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Envía un email. Devuelve { success } siempre; nunca lanza en caso de
 * no estar configurado.
 */
export async function enviarEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: EnviarParams): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!resend) {
    console.warn("Resend no configurado. Email no enviado:", subject, "->", to);
    return { success: false, error: "no_configurado" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      console.error("Error enviando email con Resend:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Excepción al enviar email:", err);
    return { success: false, error: "excepcion" };
  }
}

/** ¿Está Resend configurado con una API key real? */
export function resendConfigurado(): boolean {
  return RESEND_CONFIGURADA;
}
