# AI Agent Coding Transcripts & Debugging Logs

## Prompt 1: Initial Architecture Setup
> **User Prompt:** "Generate a FastAPI backend with dual LLM routing between Anthropic Claude SDK and local Ollama."
> **Result:** Successfully created `main.py`, `database.py`, and `router.py`.

## Prompt 2: Debugging Import & Syntax Issues
> **Issue:** Frontend threw `Module not found: Can't resolve '@/components/ArtifactCanvas'`.
> **Correction:** Updated relative import path in `page.tsx` to `./components/ArtifactCanvas`.

> **Issue:** ReactMarkdown runtime error `Expected usable value, not '{[remarkGfm]}'`.
> **Correction:** Removed string quotes around the plugin array in `page.tsx`: `remarkPlugins={[remarkGfm]}`.

## Prompt 3: Local Ollama Model Setup
> **Issue:** Backend error `ollama.ResponseError` when sending chat requests.
> **Correction:** Installed Ollama via Homebrew (`brew install ollama`), started background service (`brew services start ollama`), and pulled model weights (`ollama pull llama3`).

## Prompt 4: Frontend Refactor into "Lenny Growth Assistant"
> **User Prompt:** "Refactor `app/page.tsx` and `app/components/ArtifactCanvas.tsx` into a polished dark-mode AI workspace with a sidebar (brand header, New Chat CTA, engine toggle, skill selector, session timeline), a chat timeline with Markdown rendering, an input dock, and a slide-in Artifact Canvas."
> **Result:** Rebuilt `page.tsx`, `ArtifactCanvas.tsx`, and `globals.css`. Preserved the existing API contract (`localhost:8000` endpoints, `{ session_id, message, skill }` body, `data.response`, HTML-vs-Markdown artifact detection).

## Prompt 5: JSX Brace Corruption on Paste
> **Issue:** Build error `Expected '</', got 'string literal'` at `page.tsx`. A formatter had rewritten JSX expression props into quoted strings and collapsed multi-line tags, e.g. `<EmptyHero 'Claude 'Local 'ollama' : ? ...>` and `remarkPlugins="{[remarkGfm]}"`.
> **Correction:** Restored single-brace expressions on every prop: `provider={...}`, `skill={activeSkill.label}`, `key={idx}`, `message={m}`, `content={activeArtifact}`, `onClose={() => setActiveArtifact(null)}`, `remarkPlugins={[remarkGfm]}`. Guidance: save/download the file rather than pasting through a rich-text editor.

## Prompt 6: Per-Session History Loading & Title Sync
> **User Prompt:** "Load each session's own history and keep the sidebar title in sync."
> **Correction:** Added a `useEffect` keyed on `activeSession` that fetches `GET /api/sessions/${activeSession}/messages` and sets the timeline. Inside `handleSend`, re-fetched `GET /api/sessions` after the response so backend-generated titles render.

## Prompt 7: Google Font Not Applying
> **Issue:** Plus Jakarta Sans never rendered — the page showed the OS default font.
> **Root cause:** Tailwind's `font-sans` utility on the root `<div>` overrode the `body` font-family.
> **Correction (two steps):**
> - Redefined the token in Tailwind v4 so `font-sans` *is* Jakarta: `@theme { --font-sans: var(--font-jakarta), ...; }`.
> - Loaded the font reliably via `next/font/google` in `app/layout.tsx` (immune to adblock/CDN blocking) exposing `--font-jakarta` / `--font-mono-jb`.
> **Note:** `@theme` and `next/font` bake in at build/boot — required a dev-server restart, not just a refresh.

## Prompt 8: Engine Toggle Rendering Bug
> **Issue:** The absolute-positioned sliding "pill" in the engine toggle overlapped both labels ("Local OllamaClaude API") and inflated its height.
> **Correction:** Replaced the slider with a simple two-button segmented control (`grid grid-cols-2`); the active button gets the accent background, and both buttons use `whitespace-nowrap`.

## Prompt 9: Design Direction — Away from "AI-Generated" Look
> **User Feedback:** The indigo→violet gradient + glow read as generic AI output.
> **Correction:** Adopted a flat, high-contrast **Graphite + Lime** system — near-black `#09090b`, one lime accent (`--accent`), monospace micro-labels, white user bubbles, gradient/glow removed. Whole palette is driven by a single CSS variable for easy reflavoring. Added film grain, an indeterminate loading line, styled `kbd` keycaps, pulsing status dots, and a red error-message treatment.

## Prompt 10: Power Features Pass
> **User Prompt:** "Add ⌘K palette, streaming replies, code highlighting + per-block copy, regenerate + shortcuts, auto-grow input, scroll-to-bottom, timestamps, collapsible sidebar, and canvas copy/download/raw toggle."
> **Result:** Added `app/components/Markdown.tsx` (shared renderer with `rehype-highlight` + `CodeBlock` copy button), `app/components/CommandPalette.tsx`, and wired streaming (client-side reveal + caret), keyboard shortcuts (⌘K, ⌘N, ↑/↓, Esc), collapsible sidebar rail, and canvas actions into `page.tsx` / `ArtifactCanvas.tsx`.

## Prompt 11: Dependency Installed in Wrong Directory
> **Issue:** Build error `Module not found: Can't resolve 'rehype-highlight'` from `Markdown.tsx`.
> **Root cause:** `npm install rehype-highlight` was run in the repo root (`placement_proj/`) instead of the Next app (`frontend/`), so `frontend/node_modules` never received it.
> **Correction:** `cd frontend && npm install rehype-highlight`, then restarted `npm run dev`.

## Prompt 12: Turbopack Inferred Wrong Workspace Root
> **Issue:** `Error: Turbopack build failed... couldn't find the Next.js package (next/package.json) from .../frontend/app`.
> **Root cause:** A stray `package.json` / `package-lock.json` created at the repo root (from the earlier misplaced install) confused Turbopack's root detection.
> **Correction:** Pinned the root in `frontend/next.config.ts` — `turbopack: { root: __dirname }` — (alternatively, delete the stray root npm artifacts).

## Prompt 13: `next: command not found`
> **Issue:** `sh: next: command not found` when running `npm run dev` in `frontend`.
> **Root cause:** `frontend/node_modules` was missing the `next` binary / `.bin` link.
> **Correction:** `cd frontend && npm install` (reinstalls all deps and rebuilds `.bin/next`), then `npm run dev`. Server booted: `Next.js 16.2.12 (Turbopack) — Ready in 187ms`.

## Prompt 14: Stale Editor Underlines (Not a Build Error)
> **Issue:** Red squiggles on `CommandPalette` / `Markdown` imports in `page.tsx`, even though the app compiled and served `200 OK`.
> **Root cause:** VS Code's TypeScript language server had cached "module not found" from before the files existed; Turbopack (SWC) never consults it.
> **Correction:** Command Palette → **"TypeScript: Restart TS Server"** (or "Developer: Reload Window").

## Prompt 15: Loud Focus Ring on Command Palette Input
> **Issue:** The auto-focused ⌘K search field showed a heavy 2px lime box from the global `:focus-visible` rule.
> **Correction:** Suppressed the outline on text fields while keeping it for buttons/links: `input:focus, input:focus-visible, textarea:focus, textarea:focus-visible { outline: none; }`.

## Open Items / Notes
> - **Claude engine:** Backend returns `Error: ANTHROPIC_API_KEY environment variable is not set` when Claude is selected — set `ANTHROPIC_API_KEY` in the backend environment. Ollama needs no key.
> - **Streaming:** Currently a client-side reveal of the full response; swap onto real SSE/token streaming later without changing the caret UI.
> - **Cleanup (optional):** Remove the stray root-level `package.json` / `package-lock.json` / `node_modules`; run the one-line `pre: (props) => <CodeBlock>{props.children}</CodeBlock>` tweak in `Markdown.tsx` to clear the last TS "implicitly any" hint.