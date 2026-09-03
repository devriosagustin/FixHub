import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Configuración de NextAuth con Google OAuth + Credentials (email/contraseña)
// No usamos PrismaAdapter porque manejamos la creación de usuarios manualmente
// en el callback signIn, y usamos JWT para sesiones (sin tabla Session en BD)
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
        });

        if (!usuario || !usuario.password) return null;

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          image: usuario.imagen,
          rol: usuario.rol,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async authorized({ request, auth }) {
      const url = request.nextUrl;
      const pathname = url.pathname;

      // Rutas públicas — siempre permitir
      if (
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/registro") ||
        pathname.startsWith("/busqueda") ||
        pathname.startsWith("/planes") ||
        pathname.startsWith("/perfil/") ||
        pathname.startsWith("/terminos") ||
        pathname.startsWith("/privacidad") ||
        pathname.startsWith("/contacto") ||
        pathname.startsWith("/suscripcion/") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password")
      ) {
        return true;
      }

      // Todo lo demás requiere sesión
      if (!auth?.user) {
        return false;
      }

      // Admin solo para /admin/*
      if (pathname.startsWith("/admin") && auth.user.rol !== "ADMIN") {
        return false;
      }
      // Area de cliente solo para CLIENTE o ADMIN (trabajos publicados)
      if (
        pathname.startsWith("/cliente") &&
        auth.user.rol !== "CLIENTE" &&
        auth.user.rol !== "ADMIN"
      ) {
        return false;
      }
      // Ver/postularse a trabajos: solo PROFESIONAL o ADMIN (no clientes)
      if (
        pathname.startsWith("/trabajos") &&
        auth.user.rol !== "PROFESIONAL" &&
        auth.user.rol !== "ADMIN"
      ) {
        return false;
      }
      // Profesional o Admin para /profesional/perfil
      if (
        (pathname.startsWith("/profesional/perfil") ||
          pathname.startsWith("/profesional/estadisticas")) &&
        auth.user.rol !== "PROFESIONAL" &&
        auth.user.rol !== "ADMIN"
      ) {
        return false;
      }

      return true;
    },

    async signIn({ user, account }) {
      // Si es login con credentials, ya está verificado en authorize
      if (account?.provider === "credentials") return true;

      if (account?.provider !== "google" || !user.email) return false;

      const existente = await prisma.usuario.findFirst({
        where: { googleId: account.providerAccountId },
      });

      if (existente) return true;

      const porEmail = await prisma.usuario.findUnique({
        where: { email: user.email },
      });

      if (porEmail) {
        await prisma.usuario.update({
          where: { id: porEmail.id },
          data: { googleId: account.providerAccountId },
        });
        return true;
      }

      await prisma.usuario.create({
        data: {
          email: user.email,
          nombre: user.name || "Sin nombre",
          imagen: user.image,
          googleId: account.providerAccountId,
          rol: "CLIENTE",
        },
      });

      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.usuario.findUnique({
          where: { email: user.email },
          select: { id: true, rol: true },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.rol = dbUser.rol;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.rol = token.rol as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
