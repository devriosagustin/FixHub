-- CreateEnum
CREATE TYPE "TipoInteraccion" AS ENUM ('VISTA_PERFIL', 'CHAT_INICIADO', 'CLICK_WHATSAPP');

-- CreateTable
CREATE TABLE "InteraccionPerfil" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "tipo" "TipoInteraccion" NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteraccionPerfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InteraccionPerfil_perfilId_tipo_createdAt_idx" ON "InteraccionPerfil"("perfilId", "tipo", "createdAt");

-- AddForeignKey
ALTER TABLE "InteraccionPerfil" ADD CONSTRAINT "InteraccionPerfil_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteraccionPerfil" ADD CONSTRAINT "InteraccionPerfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
