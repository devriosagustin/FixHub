<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# fixhub — Estado del proyecto

## Objetivo
Dejar funcionando el cobro de suscripciones en la web (Next.js + Prisma + PostgreSQL) vía MercadoPago SDK, y conectar el MCP de MercadoPago a la app de escritorio de opencode mediante OAuth.

## Datos importantes
- App: fixhub (antes ContrataYa) — Next.js 16.2.10, React 19, NextAuth v5 beta, Socket.io, Prisma 6.19.3, SDK mercadopago 3.2.0.
- Dev server: `tsx watch server.ts`, corre en `http://localhost:3000`, log en `dev-server.log`. Para relanzarlo en PS 5.1 usar `Start-Process -FilePath "cmd.exe" -ArgumentList '/k npm run dev > dev-server.log 2>&1'` (la forma `cmd /c "..."` da error de argumento posicional).
- DB en Docker: contenedor `contrataya-pg` (postgres:16). env: POSTGRES_PASSWORD=postgres, DB=contrataya, puerto 5432. `.env` DATABASE_URL = `postgresql://postgres:postgres@localhost:5432/contrataya?schema=public`.
- Shell es PowerShell 5.1: NO admite `&&`; usar `;`. `docker`/`psql` quotes se rompen con strings inline — usar heredocs `@"..."@ | docker exec -i`.
- `opencode` no está en PATH; CLI en `C:\Users\riosa\AppData\Local\opencode\opencode-cli.exe`. App de escritorio en `C:\Users\riosa\AppData\Local\@opencode-aidesktop`.
- Token MP (test) validado con `users/me` → usuario Agustín Ríos (AR), site MLA. `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY` en `.env` son válidos y la SDK funciona.
- El MCP NO es necesario para cobrar (la app usa la SDK). El MCP estaba en 401 porque `opencode.json` mandaba header `Authorization: Bearer {file:.mcp-mp-token}` estático, bloqueando el flujo OAuth.
- `auto_return` SOLO acepta `"all"` | `"approved"`; NO existe `"disabled"`. En localhost debe OMITIRSE `back_urls` y `auto_return` porque exigen `back_url.success` HTTPS.
- Test card MP (Argentina): Mastercard `5031 7557 3453 0604` (aprobado) titular `APRO`/DNI `12345678`, exp `11/30`, CVV `123`; rechazos: `OTHE` (gravedad), `CALL`, `FUND`, `SECU`, etc.
- En `POST /v1/card_tokens` la exp debe ser año de 4 dígitos (`expiration_year: 2030`, NO `30`).
- `POST /v1/payments` directo rechaza `notification_url` (y `back_urls`) con `http://localhost...` ("attribute must be url valid"). En el test E2E se omite; en producción con HTTPS sí vale. El circuito en local se cierra vía `/api/suscripcion/confirmar` (consulta el pago real + `procesarPago`), no por webhook.

## Estado de trabajo

### Completado
- Diagnóstico: error checkout era `auto_return invalid. back_url.success must be defined` (back_urls HTTP en localhost).
- Fix aplicado y verificado en `src/app/api/suscripcion/checkout/route.ts:114-141`: en localhost (`esLocal`) se omite `back_urls` y `auto_return`; en producción se envía `back_urls` (`success/failure/pending`) + `auto_return:"approved"`. TypeScript compila `tsc --noEmit`.
- Preferencia de pago creada OK con SDK (sin back_urls en local) — se genera `sandbox_init_point` en modo TEST.
- Pago real aprobado con tarjeta Mastercard test (card_token vía `POST https://api.mercadopago.com/v1/card_tokens?public_key=...`). Pagos aprobados en MP.
- Test E2E con lógica real (`procesarPago` + Prisma) para perfil `test@test.com`: suscripción `PROFESIONAL` pasó `PENDIENTE_PAGO`→`ACTIVA`, insertó `Pago`, `fechaInicio`/`fechaFin` (+1 mes), `mercadopagoId`, perfil `destacado:true`.
- Dev server relanzado con fix; corriendo en :3000 sin errores; DB schema en sync (prisma db push). Prisma tiene EPERM en regenerate por DLL lock (binario OK).
- `opencode.json` actualizado: MCP `mercadopago` remote `https://mcp.mercadopago.com/mcp`, con `oauth: {}`, `enabled:true`, SIN header estático.
- **MCP de MercadoPago autenticado vía OAuth**: `opencode mcp auth mercadopago` devolvió "Authentication successful!", el callback OAuth se completó (`saved oauth tokens`, `toolCount=11`), y `opencode mcp list` muestra `✓ mercadopago connected (OAuth)`.
- **IMPORTANTE**: los tokens OAuth NO se guardan en `~/.local/share/opencode/mcp-auth.json` (ahí queda solo `clientId/codeVerifier/oauthState/serverUrl`) sino en la DB de la app de escritorio (`opencode.db`). Verificar con `opencode mcp list` (debe decir "connected (OAuth)").
- Nota de UX del OAuth: el proceso `opencode mcp auth` tiene un **timeout** (el primer intento falló con "OAuth callback timeout - authorization took too long"). Hay que completar la autorización en el navegador dentro de la ventana de vida del proceso; si expira, relanzar `opencode mcp auth mercadopago`. (2do intento OK: abrir la URL a mano en el navegador, conectar la cuenta de MP, volver al proceso.)
- **Circuito completo de suscripción probado OK (E2E con lógica real)**: para perfil `rios.agustin.med@gmail.com` (suscripción PROFESIONAL `PENDIENTE_PAGO`): se creó preferencia con SDK (`external_reference`=id suscripción), se pagó con Mastercard test vía card_token + `/v1/payments` (pago `1351371353`, ARS 4999, `approved`), y `procesarPago` (lógica que usan webhook y `/api/suscripcion/confirmar`) activó la suscripción `PENDIENTE_PAGO`→`ACTIVA`, insertó `Pago`, set `fechaInicio`/`fechaFin` (+1 mes), `mercadopagoId`, perfil `destacado:true`/`fijado:false`. Script temporal borrado tras el test.
- **Rebranding completo ContrataYa → fixhub** (commit inicial 7973d00): nombre visible (Navbar/Footer/Home/logos cuadrito "FH" + "fixhub"), emails/dominio fixhub.com (resend, contacto, register, forgot-password, metadata/robots/sitemap), carpetas Cloudinary `fixhub` (uploads, chat, galeria, certificaciones, documentos), seed admin@fixhub.com, package.json nombre "fixhub-app". `tsc --noEmit` exit 0. Repo git creado en `main`.
- **Fase A — WhatsApp completada** (commit d70bfb5):
  - Campo `whatsapp String?` agregado a `PerfilProfesional` en `prisma/schema.prisma` + `prisma db push` (schema en sync). Durante el regenerate falló EPERM por DLL lock (dev server corriendo): se detuvo el dev server, `npx prisma generate` OK, y se relanzó con `Start-Process cmd -ArgumentList '/k npm run dev > dev-server.log 2>&1'` (la forma `cmd /c "..."` da error de argumento posicional en PS 5.1).
  - Helper nuevo `src/lib/whatsapp.ts`: `normalizarWhatsApp()` (E.164 sin `+`, asume código país 54 AR) y `urlWhatsApp(num, texto)` → `https://wa.me/<número>?text=...`. Verificado: `011 4444-5555`, `+54 11 4444 5555`, `1144445555` → `541144445555`; `5491144445555` se mantiene; vacío → null (no muestra botón).
  - API `POST /api/profesionales` y `PUT /api/profesionales/[id]`: aceptan y guardan `whatsapp` (Zod opcional con regex en POST).
  - Formularios `src/app/profesional/registro/page.tsx` y `src/app/profesional/perfil/page.tsx`: campo "WhatsApp" agregado (estado, carga, envío, input).
  - `src/app/(dashboard)/perfil/[id]/ProfileClient.tsx`: botón "Llamar" (`tel:`) reemplazado por "Enviar WhatsApp" (`wa.me`) en el CTA y en el sidebar de contacto. Icono WhatsApp: SVG custom (componente `IconoWhatsApp`) porque lucide no lo tiene. Solo se muestra si el profesional cargó `whatsapp`. `tsc --noEmit` exit 0.
- **Feature Trabajos publicados por clientes completada** (commit pendiente):
  - **Schema**: modelos `Trabajo` (`clienteId`, `titulo`, `descripcion`, `oficioId`, `ciudad`, `barrio`, `tipoContratacion` enum, `presupuestoMin/Max`, `fechaLimite`, `estado` enum ABIERTO/EN_PROCESO/CERRADO, `whatsappContacto`, `createdAt`) + `Postulacion` (`trabajoId`, `perfilId`, `mensaje`, `presupuesto`, `estado`, `@@unique([trabajoId, perfilId])`). Enums `EstadoTrabajo`, `TipoContratacion` (POR_HORA/PRESUPUESTO/CONVENIR). Relaciones inversas en `Usuario` (trabajosPublicados), `Oficio` (trabajos) y `PerfilProfesional` (postulaciones). `prisma db push` + generate (sin EPERM, no había lock).
  - **Helper** `src/lib/suscripcion.ts`: `obtenerSuscripcionActivaDeUsuario()` y `tieneSuscripcionPagaActiva()` (plan pago PROFESIONAL/PREMIUM con estado ACTIVA y fechaFin no vencida).
  - **APIs**: `POST /api/trabajos` (rol CLIENTE, Zod), `GET /api/trabajos` (rol PROFESIONAL, filtros oficioId/ciudad/presupuestoMax, devuelve `tieneAcceso`), `GET /api/trabajos/mios` (trabajos del cliente + `_count.postulaciones`), `GET /api/trabajos/[id]` (dueño ve postulaciones; profesional suscrito ve contacto del cliente y oculta postulaciones), `POST /api/trabajos/[id]/postular` (profesional con suscripción paga, notifica al cliente con `NUEVO_CONTACTO`).
  - **Páginas cliente**: `/cliente/trabajos` (mis trabajos + estado + postulaciones), `/cliente/trabajos/nuevo` (publicar), `/cliente/trabajos/[id]` (ver postulaciones + "Conversar" vía `/api/chat/conversaciones`).
  - **Páginas profesional**: `/trabajos` (listado con filtros oficio/ciudad, banner de suscripción si `!tieneAcceso`), `/trabajos/[id]` (detalle, bloquea con pantalla de suscripción si 403 `requiereSuscripcion`, formulario de postulación + presupuesto).
  - **Navbar**: CLIENTE → "Publicar trabajo" (`/cliente/trabajos/nuevo`); PROFESIONAL → "Trabajos" (`/trabajos`). `auth.ts`: rutas `/cliente/*` requieren CLIENTE/ADMIN, `/trabajos*` requieren PROFESIONAL/ADMIN.
  - Verificado: typecheck exit 0, `npm run build` exit 0 (59 páginas). E2E de capa de datos: crear trabajo (enum TipoContratacion/EstadoTrabajo + whatsappContacto OK), listado con filtro oficio+ciudad insensitive, detalle con cliente, limpieza correcta. Helper suscripción: rios.agustin.med/test@test → tienePaga=true; admin → false. NO hay usuarios CLIENTE en la DB aún.

### Siguiente
- Tras conectar el MCP, reiniciar la app de escritorio de opencode para exponer las tools del MCP en futuras sesiones.

## MCP tras reiniciar opencode
- Verificado con `opencode mcp list` DESPUÉS de reiniciar la app de escritorio: `✓ mercadopago connected (OAuth)` (persiste el OAuth, las tools del MCP quedan expuestas en la sesión). El dev server siguió corriendo en :3000.

## Backlog / Roadmap (features planificadas)

### Otros / pendientes
- Notificaciones push (hoy solo browser Notification API en chat).
- Sistema formal de presupuestos/cotizaciones (hoy se hace vía postulación con campo presupuesto).
- Matching profesional↔trabajo por oficio/ubicación.
- Crear usuario CLIENTE de prueba en la DB para validar el flujo de trabajos completo en el navegador.

## Archivos relevantes
- `src/app/api/suscripcion/checkout/route.ts`: flujo de creación de preferencia MP; fix de back_urls/auto_return (líneas ~106-149). Body: `{ plan: "PROFESIONAL"|"PREMIUM" }`. Requiere sesión autenticada y perfil `APROBADO`. Retorna `checkout_url` (sandbox_init_point en TEST, init_point en prod).
- `src/lib/mercadopago.ts`: lógica compartida `procesarPago` que activa la suscripción tras pago aprobado; contenido `esMercadoPagoTest()`, `obtenerPago()`, `mpClient()`. Mapea `external_reference` = id de suscripción.
- `src/app/api/webhooks/mercadopago/route.ts` y `src/app/api/suscripcion/confirmar/route.ts`: reciben notificación MP / confirman al volver del checkout; ambos usan `procesarPago`.
- `src/lib/plans.ts`: define planes; PROFESIONAL (4999) y PREMIUM (9999) tienen `precio`; GRATUITO sin precio. `getPlanById`, `getLimite`, `tieneAcceso`.
- `src/app/api/profesionales/route.ts` y `src/app/api/profesionales/[id]/route.ts`: APIs profesionales (POST acepta `whatsapp` opcional con regex; PUT actualiza `whatsapp`).
- `src/lib/whatsapp.ts`: helper Fase A. `normalizarWhatsApp()` (E.164 sin `+`, asume 54 AR) y `urlWhatsApp(num, texto?)` → `https://wa.me/<número>` o null.
- `src/app/(dashboard)/perfil/[id]/ProfileClient.tsx`: perfil público profesional; CTA + sidebar usan "Enviar WhatsApp" (`wa.me` desde `perfil.whatsapp`), componente `IconoWhatsApp` (SVG custom).
- `src/lib/suscripcion.ts`: helper de acceso por suscripción. `obtenerSuscripcionActivaDeUsuario()` y `tieneSuscripcionPagaActiva()` (plan pago PROFESIONAL/PREMIUM, estado ACTIVA, fechaFin válida). Usado para el gating de trabajos.
- `src/app/api/trabajos/route.ts` (`POST` crear rol CLIENTE / `GET` listar rol PROFESIONAL con filtros + `tieneAcceso`), `src/app/api/trabajos/mios/route.ts` (GET trabajos del cliente), `src/app/api/trabajos/[id]/route.ts` (GET detalle, gating suscripción), `src/app/api/trabajos/[id]/postular/route.ts` (POST postulación profesional).
- `src/app/cliente/trabajos/*` (mis trabajos, nuevo, detalle) y `src/app/trabajos/*` (listado y detalle para profesionales). Navbar y `auth.ts` con rutas por rol (`/cliente/*` CLIENTE/ADMIN, `/trabajos*` PROFESIONAL/ADMIN).
- `opencode.json`: config MCP MercadoPago remoto con `oauth: {}` (sin header).
- `.env`: credentials (DATABASE_URL, MERCADOPAGO_ACCESS_TOKEN/PUBLIC_KEY, NEXT_PUBLIC_APP_URL=http://localhost:3000, Google/Cloudinary).
- `dev-server.log`: log de arranque del dev server en Windows (los requests de `next dev` no van necesariamente ahí).
