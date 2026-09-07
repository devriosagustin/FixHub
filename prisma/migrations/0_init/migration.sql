-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."EstadoDocumento" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "public"."EstadoProfesional" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "public"."EstadoSuscripcion" AS ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA', 'PENDIENTE_PAGO');

-- CreateEnum
CREATE TYPE "public"."EstadoTrabajo" AS ENUM ('ABIERTO', 'EN_PROCESO', 'CERRADO');

-- CreateEnum
CREATE TYPE "public"."PlanSuscripcion" AS ENUM ('GRATUITO', 'PROFESIONAL', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('CLIENTE', 'PROFESIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."TipoContratacion" AS ENUM ('POR_HORA', 'PRESUPUESTO', 'CONVENIR');

-- CreateEnum
CREATE TYPE "public"."TipoNotificacion" AS ENUM ('NUEVO_MENSAJE', 'RESENA_RECIBIDA', 'PROFESIONAL_APROBADO', 'PROFESIONAL_RECHAZADO', 'SUSCRIPCION_VENCE', 'NUEVO_CONTACTO');

-- CreateTable
CREATE TABLE "public"."Certificacion" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "initBy" TEXT NOT NULL,
    "ultimoMensajeAt" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentoVerificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "estado" "public"."EstadoDocumento" NOT NULL DEFAULT 'PENDIENTE',
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoVerificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FotoGaleria" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoGaleria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HorarioAtencion" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HorarioAtencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mensaje" (
    "id" TEXT NOT NULL,
    "conversacionId" TEXT NOT NULL,
    "emisorId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adjuntoNombre" TEXT,
    "adjuntoTipo" TEXT,
    "adjuntoUrl" TEXT,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "public"."TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "enlace" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Oficio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Oficio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OficioProfesional" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "oficioId" TEXT NOT NULL,

    CONSTRAINT "OficioProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pago" (
    "id" TEXT NOT NULL,
    "suscripcionId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "metodoPago" TEXT,
    "estadoPago" TEXT NOT NULL DEFAULT 'pendiente',
    "mercadopagoPagoId" TEXT,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PerfilProfesional" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT,
    "descripcion" TEXT,
    "anosExperiencia" INTEGER,
    "direccion" TEXT,
    "ciudad" TEXT,
    "barrio" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "radioCobertura" INTEGER,
    "telefono" TEXT,
    "sitioWeb" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "tipoPrecio" TEXT NOT NULL DEFAULT 'convenir',
    "precioPorHora" DOUBLE PRECISION,
    "videoUrl" TEXT,
    "estado" "public"."EstadoProfesional" NOT NULL DEFAULT 'PENDIENTE',
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "fijado" BOOLEAN NOT NULL DEFAULT false,
    "visitas" INTEGER NOT NULL DEFAULT 0,
    "contactos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whatsapp" TEXT,

    CONSTRAINT "PerfilProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Postulacion" (
    "id" TEXT NOT NULL,
    "trabajoId" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "presupuesto" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'ENVIADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Resena" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "aprobada" BOOLEAN NOT NULL DEFAULT true,
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Suscripcion" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "plan" "public"."PlanSuscripcion" NOT NULL DEFAULT 'GRATUITO',
    "estado" "public"."EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "precioMensual" DOUBLE PRECISION,
    "mercadopagoId" TEXT,
    "renovacionAuto" BOOLEAN NOT NULL DEFAULT false,
    "mercadopagoPreapprovalId" TEXT,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trabajo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "oficioId" TEXT NOT NULL,
    "ciudad" TEXT,
    "barrio" TEXT,
    "tipoContratacion" "public"."TipoContratacion" NOT NULL DEFAULT 'CONVENIR',
    "presupuestoMin" DOUBLE PRECISION,
    "presupuestoMax" DOUBLE PRECISION,
    "fechaLimite" TIMESTAMP(3),
    "estado" "public"."EstadoTrabajo" NOT NULL DEFAULT 'ABIERTO',
    "whatsappContacto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "imagen" TEXT,
    "rol" "public"."Rol" NOT NULL DEFAULT 'CLIENTE',
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "password" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversacion_clienteId_profesionalId_key" ON "public"."Conversacion"("clienteId" ASC, "profesionalId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "HorarioAtencion_perfilId_diaSemana_key" ON "public"."HorarioAtencion"("perfilId" ASC, "diaSemana" ASC);

-- CreateIndex
CREATE INDEX "Mensaje_conversacionId_createdAt_idx" ON "public"."Mensaje"("conversacionId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Oficio_nombre_key" ON "public"."Oficio"("nombre" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Oficio_slug_key" ON "public"."Oficio"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "OficioProfesional_perfilId_oficioId_key" ON "public"."OficioProfesional"("perfilId" ASC, "oficioId" ASC);

-- CreateIndex
CREATE INDEX "PerfilProfesional_ciudad_latitud_longitud_idx" ON "public"."PerfilProfesional"("ciudad" ASC, "latitud" ASC, "longitud" ASC);

-- CreateIndex
CREATE INDEX "PerfilProfesional_estado_idx" ON "public"."PerfilProfesional"("estado" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PerfilProfesional_userId_key" ON "public"."PerfilProfesional"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Postulacion_trabajoId_perfilId_key" ON "public"."Postulacion"("trabajoId" ASC, "perfilId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Resena_perfilId_clienteId_key" ON "public"."Resena"("perfilId" ASC, "clienteId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_perfilId_key" ON "public"."Suscripcion"("perfilId" ASC);

-- CreateIndex
CREATE INDEX "Trabajo_clienteId_idx" ON "public"."Trabajo"("clienteId" ASC);

-- CreateIndex
CREATE INDEX "Trabajo_estado_ciudad_idx" ON "public"."Trabajo"("estado" ASC, "ciudad" ASC);

-- CreateIndex
CREATE INDEX "Trabajo_oficioId_idx" ON "public"."Trabajo"("oficioId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "public"."Usuario"("googleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_resetToken_key" ON "public"."Usuario"("resetToken" ASC);

-- AddForeignKey
ALTER TABLE "public"."Certificacion" ADD CONSTRAINT "Certificacion_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversacion" ADD CONSTRAINT "Conversacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversacion" ADD CONSTRAINT "Conversacion_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentoVerificacion" ADD CONSTRAINT "DocumentoVerificacion_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentoVerificacion" ADD CONSTRAINT "DocumentoVerificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FotoGaleria" ADD CONSTRAINT "FotoGaleria_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HorarioAtencion" ADD CONSTRAINT "HorarioAtencion_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mensaje" ADD CONSTRAINT "Mensaje_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "public"."Conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mensaje" ADD CONSTRAINT "Mensaje_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OficioProfesional" ADD CONSTRAINT "OficioProfesional_oficioId_fkey" FOREIGN KEY ("oficioId") REFERENCES "public"."Oficio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OficioProfesional" ADD CONSTRAINT "OficioProfesional_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pago" ADD CONSTRAINT "Pago_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "public"."Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PerfilProfesional" ADD CONSTRAINT "PerfilProfesional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Postulacion" ADD CONSTRAINT "Postulacion_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Postulacion" ADD CONSTRAINT "Postulacion_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "public"."Trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resena" ADD CONSTRAINT "Resena_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resena" ADD CONSTRAINT "Resena_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Suscripcion" ADD CONSTRAINT "Suscripcion_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "public"."PerfilProfesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trabajo" ADD CONSTRAINT "Trabajo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trabajo" ADD CONSTRAINT "Trabajo_oficioId_fkey" FOREIGN KEY ("oficioId") REFERENCES "public"."Oficio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

