import axios from "axios";

const ROUTE_URL = "https://api.abacus.ai/route-llm/generate";

export async function routeLLMGenerate({ model, prompt, max_tokens = 300, temperature = 0.4 }) {
  const apiKey = process.env.ROUTELLM_API_KEY;
  if (!apiKey) throw new Error("Missing ROUTELLM_API_KEY");

  const body = { model, prompt, max_tokens, temperature };

  const res = await axios.post(ROUTE_URL, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    timeout: 30000
  });

  const text =
    res.data?.choices?.[0]?.text ??
    res.data?.choices?.[0]?.message?.content ??
    JSON.stringify(res.data);

  return String(text).trim();
}