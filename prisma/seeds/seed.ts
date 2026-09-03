import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Lista de oficios disponibles en la plataforma
const oficios = [
  { nombre: "Electricista", slug: "electricista", icono: "⚡" },
  { nombre: "Plomero", slug: "plomero", icono: "🔧" },
  { nombre: "Albañil", slug: "albanil", icono: "🧱" },
  { nombre: "Carpintero", slug: "carpintero", icono: "🪚" },
  { nombre: "Pintor", slug: "pintor", icono: "🎨" },
  { nombre: "Cerrajero", slug: "cerrajero", icono: "🔐" },
  { nombre: "Jardinero", slug: "jardinero", icono: "🌿" },
  { nombre: "Gasista", slug: "gasista", icono: "🔥" },
  { nombre: "Técnico en Aire Acondicionado", slug: "tecnico-aire-acondicionado", icono: "❄️" },
  { nombre: "Técnico en Electrodomésticos", slug: "tecnico-electrodomesticos", icono: "🏠" },
  { nombre: "Soldador", slug: "soldador", icono: "⚙️" },
  { nombre: "Techador", slug: "techador", icono: "🏗️" },
  { nombre: "Vidriero", slug: "vidriero", icono: "🪟" },
  { nombre: "Tapicero", slug: "tapicero", icono: "🛋️" },
  { nombre: "Mudanzas", slug: "mudanzas", icono: "🚚" },
  { nombre: "Limpieza", slug: "limpieza", icono: "🧹" },
  { nombre: "Fumigador", slug: "fumigador", icono: "🐛" },
  { nombre: "Cerramientos", slug: "cerramientos", icono: "🏢" },
];

async function main() {
  console.log("🌱 Iniciando seed de base de datos...\n");

  // =============================================
  // 1. CREAR OFICIOS
  // =============================================
  for (const oficio of oficios) {
    const existente = await prisma.oficio.findUnique({
      where: { slug: oficio.slug },
    });

    if (!existente) {
      await prisma.oficio.create({
        data: oficio,
      });
      console.log(`  ✅ Oficio creado: ${oficio.nombre}`);
    } else {
      console.log(`  ⏭️  Oficio ya existe: ${oficio.nombre}`);
    }
  }

  // =============================================
  // 2. CREAR USUARIO ADMIN
  // =============================================
  const adminEmail = "admin@fixhub.com";
  const adminPassword = "admin123";
  const adminExistente = await prisma.usuario.findUnique({
    where: { email: adminEmail },
  });

  if (!adminExistente) {
    await prisma.usuario.create({
      data: {
        email: adminEmail,
        nombre: "Administrador",
        password: await bcrypt.hash(adminPassword, 12),
        rol: "ADMIN",
      },
    });
    console.log(`\n  ✅ Admin creado: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`\n  ⏭️  Admin ya existe: ${adminEmail}`);
  }

  // =============================================
  // 3. CREAR USUARIO DE PRUEBA (CLIENTE)
  // =============================================
  const testEmail = "test@test.com";
  const testPassword = "test123";
  const testExistente = await prisma.usuario.findUnique({
    where: { email: testEmail },
  });

  if (!testExistente) {
    await prisma.usuario.create({
      data: {
        email: testEmail,
        nombre: "Usuario Test",
        password: await bcrypt.hash(testPassword, 12),
        rol: "CLIENTE",
      },
    });
    console.log(`\n  ✅ Usuario test creado: ${testEmail} / ${testPassword}`);
  } else {
    console.log(`\n  ⏭️  Usuario test ya existe: ${testEmail}`);
  }

  console.log("\n🎉 Seed completado exitosamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
