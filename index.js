import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(bodyParser.json());

const {
  VERIFY_TOKEN,
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  ROUTELLM_API_KEY,
  PORT
} = process.env;

const sessions = new Map();
const getSession = (id) => {
  if (!sessions.has(id)) sessions.set(id, { history: [] });
  return sessions.get(id);
};

// Edison persona – edit to your style
const SYSTEM_PROMPT = `
You are Edison, our sales rep. Be friendly, concise, a bit witty.
Rules: short sentences; 1 emoji max only when helpful; never invent policy; ask 1 clarifying Q if ambiguous; offer human handoff on frustration or request. End with a next step suggestion.
`;

// Webhook verification (Meta calls GET once to verify)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// Incoming WhatsApp messages
app.post("/webhook", async (req, res) => {
  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    const from = msg?.from;
    const text = msg?.text?.body;

    if (from && text) {
      const reply = await getReply(from, text);
      await sendWhatsApp(from, reply);
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e?.response?.data || e.message);
    res.sendStatus(200);
  }
});

async function getReply(userId, userMsg) {
  const s = getSession(userId);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...s.history.slice(-6),
    { role: "user", content: userMsg }
  ];

  try {
    const resp = await axios.post(
      "https://api.abacus.ai/route-llm/chat/completions",
      { model: "auto", messages, temperature: 0.3, max_tokens: 350 },
      { headers: { Authorization: `Bearer ${ROUTELLM_API_KEY}` } }
    );
    const answer = resp.data?.choices?.[0]?.message?.content?.trim()
      || "Sorry, could you rephrase that?";
    s.history.push({ role: "user", content: userMsg }, { role: "assistant", content: answer });
    return answer;
  } catch (err) {
    console.error("LLM error:", err?.response?.data || err.message);
    return "I’m having a quick tech hiccup. Mind trying again in a moment?";
  }
}

async function sendWhatsApp(to, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: "whatsapp", to, text: { body: text } },
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
  );
}

app.listen(PORT || 3000, () => console.log(`Bot listening on ${PORT || 3000}`));