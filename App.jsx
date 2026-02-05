import React, { useState } from "react";

export default function App() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = msg.trim();
    if (!text || busy) return;

    setBusy(true);
    setChat((prev) => [...prev, { role: "user", content: text }]);
    setMsg("");

    try {
      const res = await fetch("http://localhost:8080/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }] })
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${t}`);
      }

      const data = await res.json();
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: data.text, provider: data.provider, note: data.note }
      ]);
    } catch (e) {
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e.message}`, provider: "error" }
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Arial" }}>
      <h2>WebChatGPT (Hybrid: OpenAI + Ollama)</h2>

      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 10, minHeight: 250 }}>
        {chat.map((m, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <b>{m.role === "user" ? "You" : "Bot"}</b>
            {m.role !== "user" && m.provider && (
              <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.7 }}>
                via {m.provider}{m.note ? " (fallback)" : ""}
              </span>
            )}
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
          disabled={busy}
        />
        <button onClick={send} disabled={busy} style={{ padding: "10px 16px", borderRadius: 8 }}>
          {busy ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
