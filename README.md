# WebChatGPT – Hybrid AI Chat Application

WebChatGPT is a full-stack AI-powered chat application that demonstrates a **hybrid Large Language Model (LLM) architecture**.  
The system primarily uses OpenAI’s API and automatically falls back to a **local LLM (Ollama)** when API quota, rate limits, or network failures occur.

This project focuses on **real-world production considerations** such as reliability, cost optimization, and fault tolerance.

---

## 🚀 Features
- AI-powered conversational chat interface
- Primary integration with OpenAI (`gpt-4o-mini`)
- Automatic fallback to local LLM via Ollama (no API cost)
- Handles quota exhaustion, rate limiting, and API failures gracefully
- Clean client–server separation
- Secure API key handling using environment variables

---

## 🛠 Tech Stack
**Frontend**
- React
- Vite
- JavaScript

**Backend**
- Node.js
- Express.js
- OpenAI SDK
- Ollama (local LLM inference)

---

## 🧩 Architecture
- React frontend communicates with a Node.js REST API
- Backend attempts OpenAI inference first
- On failure (401, 429, network errors), system automatically switches to a local LLM
- Provider used for each response is surfaced to the UI

---

## ⚙️ Setup Instructions

### Backend
```bash
cd server
npm install
node index.js
