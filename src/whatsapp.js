import axios from "axios";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export async function sendWhatsAppText(to, body) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("Missing WhatsApp credentials");

  const url = `${GRAPH_BASE}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body }
  };

  await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    timeout: 20000
  });
}

export function parseIncoming(body) {
  try {
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    const from = msg?.from;
    const text = msg?.text?.body;
    return { from, text, raw: msg };
  } catch {
    return { from: null, text: null, raw: null };
  }
}