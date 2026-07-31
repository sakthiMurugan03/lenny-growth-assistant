# Product Requirements Document (PRD)

## Project Name: The Lenny Growth Assistant

### 1. Objective
Build an AI-powered conversational workspace that ingests transcripts from Lenny's Podcast, answers growth and product management questions strictly grounded in those insights, generates long-form Ship30for30 style content, and renders artifacts side-by-side in a split-view UI.

### 2. Core Functional Requirements
- **FastAPI Backend:** Dual-engine LLM router supporting Anthropic Claude 3.5 Sonnet and local Ollama (`llama3`).
- **Session Management:** Persistent chat history stored in PostgreSQL / SQLite databases.
- **RAG Knowledge Base:** ChromaDB vector database embedding transcript chunks from Lenny's Podcast.
- **Agentic Skills:**
  - *Transcript Grounded Q&A:* Provides growth framework insights citing guests and episodes.
  - *Ship30for30 Generator:* Creates ~1250-word atomic essays formatted with strong hooks, bold key terms, and bullet points for high skimmability.
- **Artifact Viewer UI:** Side-by-side canvas rendering generated markdown essays and previewing components.