import "dotenv/config";
import express from "express";
import fs from "fs";
import { sendWhatsAppText, parseIncoming } from "./whatsapp.js";
import { routeLLMGenerate } from "./routeLLM.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { retrieveRelevant } from "./retrieval.js";

const app = express();
app.use(express.json());

// Load KB at boot. We’ll re-read per message for hot reload.
let knowledge = JSON.parse(fs.readFileSync("./knowledge/knowledge_base.json", "utf-8"));

app.get("/", (req, res) => {
  res.status(200).send("Motas is running");
});

// WhatsApp webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// WhatsApp message handler
app.post("/webhook", async (req, res) => {
  try {
    const { from, text } = parseIncoming(req.body);
    if (!from || !text) {
      res.sendStatus(200);
      return;
    }

    // Hot reload KB
    try {
      knowledge = JSON.parse(fs.readFileSync("./knowledge/knowledge_base.json", "utf-8"));
    } catch {}

    // Retrieve context
    const retrieved = retrieveRelevant(knowledge, text, 6);

    // Build prompts
    const systemPrompt = buildSystemPrompt(knowledge);
    const userPrompt = buildUserPrompt(text, retrieved);
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    const model = process.env.MODEL_ALIAS || "gpt-4o-mini";
    const temperature = Number(process.env.TEMPERATURE || 0.4);
    const max_tokens = Number(process.env.MAX_TOKENS || 300);

    // Generate reply
    const reply = await routeLLMGenerate({
      model,
      prompt: fullPrompt,
      temperature,
      max_tokens
    });

    const finalReply =
      (reply && reply.trim()) ||
      "Gracias por escribirnos. Te conecto con un asesor para ayudarte mejor. 🙌";

    await sendWhatsAppText(from, finalReply);
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err?.response?.data || err.message);
    // Respond 200 to avoid retries storm
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Motas listening on port ${port}`);
});