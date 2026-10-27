# Agente de WhatsApp con Gemini (Vercel)

Recibe los mensajes de WhatsApp Business (Cloud API), se los pasa a Gemini junto con la información de tu negocio y responde automáticamente. Solo contesta lo que está en `lib/knowledge.js`.

```
Cliente → WhatsApp → Meta → /api/webhook (Vercel) → Gemini → respuesta → WhatsApp
```

## Estructura

- `api/webhook.js` → el webhook (verificación + recibir mensajes + responder)
- `lib/knowledge.js` → **acá cargás tu información** (horarios, VTV, costos, requisitos)
- `.env.example` → lista de variables de entorno necesarias

## Paso 1: Editar la información del negocio

Abrí `lib/knowledge.js` y reemplazá todos los `[COMPLETAR]` con datos reales. Cuanto más claro lo escribas, mejor responde.

## Paso 2: Subir a GitHub

```bash
git init
git add .
git commit -m "Agente WhatsApp"
git branch -M main
# creá un repo vacío en github.com y copiá su URL:
git remote add origin https://github.com/TU_USUARIO/whatsapp-agent.git
git push -u origin main
```

Tip: si no tenés git en la compu del local, podés crear el repo en github.com y usar "Add file > Upload files" arrastrando las carpetas.

## Paso 3: API key de Gemini (gratis)

1. Entrá a https://aistudio.google.com/apikey
2. "Create API key" y copiala.

## Paso 4: Deploy en Vercel

1. En https://vercel.com entrá con GitHub y elegí "Add New > Project".
2. Importá el repo `whatsapp-agent`.
3. Antes de deployar, en "Environment Variables" cargá:
   - `VERIFY_TOKEN` (inventalo vos, texto largo)
   - `GEMINI_API_KEY`
   - `WHATSAPP_TOKEN` y `PHONE_NUMBER_ID` (los conseguís en el paso 5; podés dejarlos para después y redeployar)
4. Deploy. Tu webhook queda en: `https://TU-PROYECTO.vercel.app/api/webhook`

## Paso 5: Conectar WhatsApp Cloud API (Meta)

1. Entrá a https://developers.facebook.com > "Create App" > tipo **Business**.
2. Agregá el producto **WhatsApp**.
3. En **API Setup** vas a ver el `Phone number ID` y un token temporal (dura 24 hs, sirve para probar).
4. En **Configuration > Webhook**:
   - Callback URL: `https://TU-PROYECTO.vercel.app/api/webhook`
   - Verify token: el mismo `VERIFY_TOKEN` de Vercel
   - Verificar y guardar, y suscribite al campo **messages**.
5. Token permanente: en business.facebook.com > Configuración > Usuarios del sistema, creá un usuario del sistema, asignale la app, y generá un token con permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Ponelo en Vercel como `WHATSAPP_TOKEN` y redeployá.
6. Mandá un mensaje al número de prueba y debería contestar.

## Importante sobre tu número actual

Si hoy usás la **app WhatsApp Business** en el celular, ese mismo número no se puede usar libremente con la Cloud API: Meta ofrece un modo "coexistencia" (usar app y API a la vez) en algunos países y requisitos, o hay que migrar el número a la API y dejar de usar la app. Verificá en el panel de Meta qué opción te habilita para tu número antes de migrarlo. Mientras tanto, podés probar con el número de prueba que da Meta sin tocar el real.

## Probar local (opcional)

```bash
npm i -g vercel
vercel dev
```

## Notas

- **Plan gratis de Gemini**: tiene límites de mensajes por minuto/día. Con tráfico de un local alcanza, pero mirá los límites vigentes en AI Studio. En el plan gratis, Google puede usar los datos enviados para mejorar sus productos, así que no cargues datos sensibles en `knowledge.js`.
- **Memoria de conversación**: esta versión responde cada mensaje de forma independiente (ideal para consultas puntuales). Si querés que recuerde el hilo, se puede sumar una base de datos (Vercel KV / Upstash).
- **Ventana de 24 hs**: WhatsApp solo permite responder libremente dentro de las 24 hs del último mensaje del cliente, que es justo el caso de este bot.
- **Derivar a humano**: si la consulta no está en tu información, el bot avisa que el equipo responde después. Podés revisar esos chats desde Meta Business Suite.
