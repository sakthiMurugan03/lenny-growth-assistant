---
title: Lenny Growth Backend
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# Lenny Growth Assistant

> An agentic, dual-engine **RAG copilot** for product managers and growth engineers — grounded in Lenny's Podcast transcripts.

<p align="left">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="ChromaDB" src="https://img.shields.io/badge/ChromaDB-VectorStore-FF6F61" />
  <img alt="Ollama" src="https://img.shields.io/badge/Ollama-llama3-000000?logo=ollama&logoColor=white" />
  <img alt="Claude" src="https://img.shields.io/badge/Claude-3.5_Sonnet-D97757?logo=anthropic&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-bef264" />
</p>

---

## Overview

**Lenny Growth Assistant** is a locally-runnable, retrieval-augmented AI workspace that answers product and growth questions using **Lenny's Podcast transcripts** as its knowledge base. Every answer is grounded in retrieved source passages to minimize hallucination, and you can flip between a **fully local engine (Ollama · llama3)** and the **Anthropic Claude 3.5 Sonnet API** with a single click or keystroke.

Beyond Q&A, it ships an agentic **skill system** — including a *Ship30for30* atomic-essay generator — and a polished **Graphite + Lime** dark UI with a slide-in Artifact Canvas, persistent chat history, and keyboard-first navigation.

---

## Feature Highlights

- **Dual LLM engine router** — switch between Local Ollama (`llama3`) and Claude 3.5 Sonnet per request; the backend routes accordingly.
- **Grounded transcript RAG** — SentenceTransformers embeddings + ChromaDB similarity search inject relevant transcript passages into the prompt, keeping answers cited and hallucination-resistant.
- **Skill system** — *Grounded Transcript Q&A* for cited answers and *Ship30for30 Atomic Essay* for long-form generation.
- **Artifact Canvas** — a side-by-side, slide-in panel for long-form content with Copy, Download (`.md` / `.html`), and Raw ↔ Rendered toggle; auto-detects and previews HTML in an iframe.
- **Session persistence** — chat sessions and messages stored in SQLite via SQLAlchemy; each session loads its own isolated history.
- **Command palette & shortcuts** — `⌘K` palette to jump sessions or switch engine/skill, `⌘N` new chat, `↑/↓` session nav, `Esc` to close the canvas.
- **Streaming replies + syntax highlighting** — token-style reveal with a caret, and code blocks with per-block copy.
- **Graphite + Lime theme** — flat, high-contrast dark UI (single-token accent, film grain, monospace micro-labels) that stays out of the way.

---

## Architecture

```
                         ┌──────────────────────────────────────────────┐
                         │                 FRONTEND                     │
                         │        Next.js 15 · React 19 · Tailwind      │
                         │  ┌───────────┐  ┌──────────┐  ┌────────────┐ │
                         │  │  Sidebar  │  │ Timeline │  │  Artifact  │ │
                         │  │ (engine / │  │ (chat +  │  │   Canvas   │ │
                         │  │  skills)  │  │ markdown)│  │ (slide-in) │ │
                         │  └───────────┘  └──────────┘  └────────────┘ │
                         └───────────────────────┬──────────────────────┘
                                                 │  REST (JSON) :8000
                                                 ▼
                         ┌──────────────────────────────────────────────┐
                         │                  BACKEND                     │
                         │                  FastAPI                     │
                         │  ┌───────────────── router.py ─────────────┐ │
                         │  │        Dual-Engine LLM Router            │ │
                         │  └───────┬─────────────────────────┬───────┘ │
                         │          │                         │         │
                         │   ┌──────▼──────┐          ┌───────▼───────┐ │
                         │   │   Ollama    │          │  Claude 3.5   │ │
                         │   │  (llama3)   │          │  Sonnet SDK   │ │
                         │   └─────────────┘          └───────────────┘ │
                         │          ▲                                   │
                         │   ┌──────┴───────── RAG retrieval ─────────┐ │
                         │   │  SentenceTransformers (all-MiniLM-L6)  │ │
                         │   │              ▼                         │ │
                         │   │   ChromaDB  (transcript vector store)  │ │
                         │   └────────────────────────────────────────┘ │
                         │                                              │
                         │   SQLite + SQLAlchemy  →  session history    │
                         └──────────────────────────────────────────────┘
                                                 ▲
                                    ingest.py → chunk + embed transcripts
```

**Request flow:** the frontend sends `{ session_id, message, skill }` to `POST /api/chat` → the router embeds the query, retrieves top-k transcript chunks from ChromaDB, builds a grounded prompt, dispatches to the active engine (Ollama or Claude), persists the exchange to SQLite, and returns the response for rendering (and optional Artifact Canvas display).

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Next.js 15, React 19, Tailwind CSS (Graphite + Lime theme), `react-markdown` + `remark-gfm` + `rehype-highlight` |
| **Backend** | FastAPI (Python 3.11+), Uvicorn |
| **Vector store** | ChromaDB |
| **Embeddings** | SentenceTransformers — `all-MiniLM-L6-v2` |
| **Local LLM** | Ollama — `llama3` |
| **Cloud LLM** | Anthropic Claude 3.5 Sonnet (official SDK) |
| **Database / ORM** | SQLite + SQLAlchemy |

---

## Project Structure

```
placement_proj/
├── backend/
│   ├── main.py            # FastAPI app + CORS + route registration
│   ├── router.py          # Dual-engine LLM router + RAG orchestration
│   ├── database.py        # SQLAlchemy engine / session factory
│   ├── models.py          # ORM models (Session, Message)
│   ├── ingest.py          # Transcript chunking + embedding → ChromaDB
│   ├── chroma_db/         # Persisted vector store
│   └── lenny_chat.db      # SQLite session history
├── docs/                  # Source transcripts / knowledge base
├── data/                  # Raw data assets
└── frontend/
    └── app/
        ├── page.tsx               # Main workspace (sidebar, timeline, dock)
        ├── layout.tsx             # Root layout + next/font
        ├── globals.css            # Graphite + Lime design system
        └── components/
            ├── ArtifactCanvas.tsx # Slide-in document panel
            ├── CommandPalette.tsx # ⌘K palette
            └── Markdown.tsx       # Shared renderer (highlight + copy)
```

---

## Quickstart

### Prerequisites

- **Node.js** 18.18+ and npm
- **Python** 3.11+
- **Ollama** (for the local engine) — [ollama.com](https://ollama.com)
- An **Anthropic API key** (optional — only needed for the Claude engine)

### 1 · Backend (FastAPI + Ollama)

```bash
# from the repo root
cd backend

# create + activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# start Ollama and pull the model (one-time)
brew install ollama             # macOS; see ollama.com for other platforms
brew services start ollama
ollama pull llama3

# ingest transcripts into ChromaDB (one-time / when docs change)
python ingest.py

# run the API
uvicorn main:app --reload --port 8000
```

The API is now live at **http://localhost:8000**.

### 2 · Frontend (Next.js)

```bash
# from the repo root
cd frontend

npm install
npm run dev
```

Open **http://localhost:3000** and start chatting.

> **Note:** run npm commands **inside `frontend/`**, not the repo root — the Next app has its own `package.json`. The workspace root is pinned in `next.config.ts` via `turbopack: { root: __dirname }`.

---

## Environment Variables

Create a `.env` file in **`backend/`**:

```env
# Required only for the Claude engine (Ollama needs no key)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# Optional overrides (defaults shown)
OLLAMA_MODEL=llama3
OLLAMA_HOST=http://localhost:11434
CHROMA_DIR=./chroma_db
DATABASE_URL=sqlite:///./lenny_chat.db
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

Optionally, in **`frontend/`** (`.env.local`) if you host the API elsewhere:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

> Selecting **Claude API** without `ANTHROPIC_API_KEY` set returns
> `Error: ANTHROPIC_API_KEY environment variable is not set` — the UI renders this as a distinct error message. Local Ollama requires no key.

---

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/sessions` | List all chat sessions |
| `POST` | `/api/sessions` | Create a new session |
| `GET` | `/api/sessions/{id}/messages` | Fetch a session's message history |
| `POST` | `/api/config` | Set the active engine (`{ provider }`) |
| `POST` | `/api/chat` | Send a message (`{ session_id, message, skill }`) → `{ response }` |

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘K` / `Ctrl+K` | Open the command palette |
| `⌘N` / `Ctrl+N` | New chat session |
| `↑` / `↓` | Move between sessions |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Esc` | Close the Artifact Canvas |

---

## Roadmap

- Real server-sent-events (SSE) token streaming (the UI caret already supports it)
- Inline citations linking back to transcript timestamps
- Additional skills (competitive teardown, PRD drafting)
- Session rename / delete and export

---

## License

Released under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<p align="center"><em>Built with grounded RAG, a dual-engine router, and a Graphite + Lime interface.</em></p>