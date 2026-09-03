<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ContrataYa — Estado del proyecto

## Objetivo
Dejar funcionando el cobro de suscripciones en la web (Next.js + Prisma + PostgreSQL) vía MercadoPago SDK, y conectar el MCP de MercadoPago a la app de escritorio de opencode mediante OAuth.

## Datos importantes
- App: ContrataYa (Next.js 16.2.10, React 19, NextAuth v5 beta, Socket.io, Prisma 6.19.3, SDK mercadopago 3.2.0).
- Dev server: `tsx watch server.ts`, corre en `http://localhost:3000`, log en `dev-server.log` (lanzado con `Start-Process cmd /c npm run dev > dev-server.log 2>&1`).
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

### Siguiente
- Tras conectar el MCP, reiniciar la app de escritorio de opencode para exponer las tools del MCP en futuras sesiones.

## MCP tras reiniciar opencode
- Verificado con `opencode mcp list` DESPUÉS de reiniciar la app de escritorio: `✓ mercadopago connected (OAuth)` (persiste el OAuth, las tools del MCP quedan expuestas en la sesión). El dev server siguió corriendo en :3000.

## Backlog / Roadmap (features planificadas)

### Trabajo (Empleo) publicado por clientes — NUEVO
- **Modelo Prisma nuevo** `Trabajo` (+ enums `EstadoTrabajo`, `TipoTrabajo`): campos propuestos: `clienteId` (Usuario), `titulo`, `descripcion`, `oficioId`, `ciudad`, `presupuestoMin`/`presupuestoMax`, `fechaLimite`, `estado` (abierto/en-proceso/cerrado), `createdAt`. Relación N:1 a Usuario (cliente) y a Oficio.
- **Publicación de trabajo** (cliente): ruta/UI de publicar trabajo (accesible a rol CLIENTE). Endpoint `POST /api/trabajos`.
- **Listado/visor de trabajos** (profesional): página para que profesionales suscritos vean trabajos abiertos, con **filtros** (por oficio, ciudad, presupuesto, fecha). Acceso restringido a profesionales con suscripción ACTIVA (`getLimite`/`tieneAcceso`).
- **Contactar al cliente/publicar mensaje**: profesional manda mensaje/presupuesto a los trabajos. Reutilizar `Conversacion`+`Mensaje` o crear candidatura.
- Acceso por suscripción: solo profesionales suscritos ven/filtran/postulan (fase de pago).

### WhatsApp en PerfilProfesional — CAMBIO
- **Nuevo campo `whatsapp`** en `PerfilProfesional` (schema + formularios registro/edición + API profesional). DECISIÓN: apunta al WhatsApp del **profesional** (el número al que escribe el cliente visitante), no del cliente. Es un campo separado del `telefono` (permite número de WhatsApp distinto y validación de formato).
- **Reemplazar botón "Llamar" por "Enviar WhatsApp"**: en `src/app/(dashboard)/perfil/[id]/ProfileClient.tsx` (CTA líneas ~189-196 con `tel:` y sidebar de contacto líneas ~362-365) → enlace `https://wa.me/<código país><número>` (icono WhatsApp: no hay en lucide → usar SVG custom o `MessageCircle`).
- **Recomendación (confirmada por usuario)**: el `tel:` falla en web móvil (no tiene app de llamadas universalmente). El enlace `wa.me` funciona en cualquier navegador, abre WhatsApp con el número precargado y un mensaje predefinido. Quitar el botón de llamar del CTA y del sidebar y reemplazarlo por WhatsApp.
- Implementación primero: WhatsApp, luego trabajos.

### Otros / pendientes
- Notificaciones push (hoy solo browser Notification API en chat).
- Sistema formal de presupuestos/cotizaciones.
- Matching profesional↔trabajo por oficio/ubicación.

## Archivos relevantes
- `src/app/api/suscripcion/checkout/route.ts`: flujo de creación de preferencia MP; fix de back_urls/auto_return (líneas ~106-149). Body: `{ plan: "PROFESIONAL"|"PREMIUM" }`. Requiere sesión autenticada y perfil `APROBADO`. Retorna `checkout_url` (sandbox_init_point en TEST, init_point en prod).
- `src/lib/mercadopago.ts`: lógica compartida `procesarPago` que activa la suscripción tras pago aprobado; contenido `esMercadoPagoTest()`, `obtenerPago()`, `mpClient()`. Mapea `external_reference` = id de suscripción.
- `src/app/api/webhooks/mercadopago/route.ts` y `src/app/api/suscripcion/confirmar/route.ts`: reciben notificación MP / confirman al volver del checkout; ambos usan `procesarPago`.
- `src/lib/plans.ts`: define planes; PROFESIONAL (4999) y PREMIUM (9999) tienen `precio`; GRATUITO sin precio. `getPlanById`, `getLimite`, `tieneAcceso`.
- `opencode.json`: config MCP MercadoPago remoto con `oauth: {}` (sin header).
- `.env`: credentials (DATABASE_URL, MERCADOPAGO_ACCESS_TOKEN/PUBLIC_KEY, NEXT_PUBLIC_APP_URL=http://localhost:3000, Google/Cloudinary).
- `dev-server.log`: log de arranque del dev server en Windows (los requests de `next dev` no van necesariamente ahí).
