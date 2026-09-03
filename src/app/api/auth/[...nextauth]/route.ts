// API Route de NextAuth - maneja todas las peticiones de autenticación
// /api/auth/[...nextauth] captura: /api/auth/signin, /api/auth/signout, /api/auth/session, etc.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
