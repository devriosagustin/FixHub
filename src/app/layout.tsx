import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "fixhub - Encuentra profesionales de confianza",
    template: "%s | fixhub",
  },
  description:
    "Plataforma que conecta clientes con profesionales verificados: electricistas, plomeros, albañiles, carpinteros, pintores y más. Encontrá al profesional ideal cerca tuyo.",
  keywords: [
    "profesionales",
    "electricista",
    "plomero",
    "albañil",
    "carpintero",
    "pintor",
    "cerrajero",
    "jardinero",
    "contratar servicios",
    "servicios domicile",
    "profesionales verificados",
  ],
  authors: [{ name: "fixhub" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "fixhub",
    title: "fixhub - Encuentra profesionales de confianza",
    description:
      "Conectá con profesionales verificados cerca tuyo. Electricistas, plomeros, albañiles y más.",
  },
  twitter: {
    card: "summary_large_image",
    title: "fixhub - Profesionales de confianza",
    description:
      "Encontrá al profesional ideal cerca tuyo. Verificados y con reseñas.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
