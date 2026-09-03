import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

// Extender tipos de NextAuth para incluir nuestro campo rol y userId
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    rol: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId: string;
    rol: string;
  }
}
