import { KNOWLEDGE } from "../lib/knowledge.js";

const { VERIFY_TOKEN, WHATSAPP_TOKEN, PHONE_NUMBER_ID, GEMINI_API_KEY } = process.env;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export default async function handler(req, res) {
  // 1) Verificación del webhook (Meta hace un GET al configurarlo)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  if (req.method !== "POST") return res.status(405).end();

  // 2) Mensajes entrantes
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];

    if (msg) {
      let reply;
      if (msg.type === "text") {
        reply = await askGemini(msg.text.body);
      } else {
        reply = "Por ahora solo puedo leer mensajes de texto. ¿Me escribís tu consulta?";
      }
      await sendWhatsApp(msg.from, reply);
    }
  } catch (err) {
    console.error("Error procesando mensaje:", err);
  }

  // Meta necesita un 200 siempre, si no reintenta el mensaje
  return res.status(200).end();
}

function systemPrompt() {
  const ahora = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Sos el asistente de WhatsApp del negocio. Respondés en español rioplatense, de forma amable, breve y clara.

Fecha y hora actual en Argentina: ${ahora}.

REGLAS:
- Respondé SOLO con la información de abajo. No inventes precios, horarios ni requisitos.
- Si te preguntan por "hoy" o "mañana", usá la fecha actual para saber qué día de la semana es y respondé el horario de ese día.
- Respondé solo lo que preguntan, sin agregar información de más.
- Si la consulta no está en la información, decí que un integrante del equipo les va a responder a la brevedad.
- No uses markdown ni listas largas: es WhatsApp.

INFORMACIÓN DEL NEGOCIO:
${KNOWLEDGE}`;
}

async function askGemini(userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt() }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    "Un integrante del equipo te va a responder a la brevedad."
  );
}

async function sendWhatsApp(to, text) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${await r.text()}`);
}
