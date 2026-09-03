"use client";

import { SessionProvider } from "next-auth/react";

// Wrapper que provee la sesión de NextAuth a todos los componentes hijos
// Se usa en el layout raíz para que cualquier componente client pueda usar useSession
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
