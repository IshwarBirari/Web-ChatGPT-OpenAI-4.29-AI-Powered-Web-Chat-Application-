import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8080;

// OpenAI is OPTIONAL in hybrid mode
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Ollama settings
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").trim();
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || "llama3.2").trim();

app.get("/health", async (req, res) => {
  // basic health + whether providers are configured
  res.json({
    ok: true,
    openaiConfigured: Boolean(openai),
    ollamaBaseUrl: OLLAMA_BASE_URL,
    ollamaModel: OLLAMA_MODEL
  });
});

function isFallbackWorthy(err) {
  // OpenAI SDK errors often expose status codes
  const status = err?.status || err?.response?.status;
  // Fallback on auth/quota/rate limit and network-ish issues
  return (
    status === 401 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed/i.test(String(err?.message || err))
  );
}

async function callOpenAI(messages) {
  if (!openai) throw new Error("OpenAI not configured (missing OPENAI_API_KEY).");

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages,
    temperature: 0.7
  });

  const text = completion.choices?.[0]?.message?.content ?? "";
  return { text, provider: "openai" };
}

async function callOllama(messages) {
  // Ollama chat API: POST /api/chat
  const resp = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false
    })
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Ollama error ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  const text = data?.message?.content ?? "";
  return { text, provider: "ollama" };
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    // Keep last N messages to avoid huge payloads
    const safeMessages = messages.slice(-20).map((m) => ({
      role: m.role,
      content: String(m.content ?? "")
    }));

    // Try OpenAI first if configured, else go straight to Ollama
    if (openai) {
      try {
        const out = await callOpenAI(safeMessages);
        return res.json(out);
      } catch (err) {
        console.error("OpenAI failed -> fallback check:", err?.status, err?.message);
        if (!isFallbackWorthy(err)) {
          return res.status(500).json({ error: "OpenAI request failed", detail: String(err?.message || err) });
        }
        // fallback to ollama
        const out = await callOllama(safeMessages);
        return res.json({ ...out, note: "Fell back to Ollama due to OpenAI failure/quota." });
      }
    } else {
      const out = await callOllama(safeMessages);
      return res.json({ ...out, note: "OpenAI not configured; served by Ollama." });
    }
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error", detail: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI configured: ${Boolean(openai)}`);
  console.log(`Ollama: ${OLLAMA_BASE_URL} | model=${OLLAMA_MODEL}`);
});
