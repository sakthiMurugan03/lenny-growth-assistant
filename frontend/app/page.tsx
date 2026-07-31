'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ArtifactCanvas from './components/ArtifactCanvas';
import CommandPalette from './components/CommandPalette';
import Markdown from './components/Markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts?: number;
}

interface Session {
  id: string;
  title: string;
}

type Provider = 'ollama' | 'claude';
type Skill = 'qa' | 'ship30for30';

const SKILLS: { id: Skill; label: string; hint: string }[] = [
  { id: 'qa', label: 'Grounded Transcript Q&A', hint: "Answers cited from Lenny's transcripts" },
  { id: 'ship30for30', label: 'Ship30for30 Atomic Essay', hint: 'Long-form atomic essay generator' },
];

function relativeTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>('ollama');
  const [skill, setSkill] = useState<Skill>('qa');
  const [skillOpen, setSkillOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [streamIdx, setStreamIdx] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const skillRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);

  const activeSkill = SKILLS.find((s) => s.id === skill)!;
  const providerLabel = provider === 'ollama' ? 'Local Ollama' : 'Claude API';

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  /* ---- data bootstrap ---- */
  useEffect(() => {
    fetch('http://localhost:8000/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        if (data.length > 0) setActiveSession(data[0].id);
        else createNewSession();
      })
      .catch(() => createNewSession());
  }, []);

  /* ---- load isolated history whenever the active session changes ---- */
  useEffect(() => {
    if (!activeSession) return;
    setStreamIdx(null);
    fetch(`http://localhost:8000/api/sessions/${activeSession}/messages`)
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]));
  }, [activeSession]);

  /* ---- auto-scroll timeline ---- */
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  /* ---- close skill dropdown on outside click ---- */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const createNewSession = async () => {
    const res = await fetch('http://localhost:8000/api/sessions', { method: 'POST' });
    const data = await res.json();
    setSessions((prev) => [data, ...prev]);
    setActiveSession(data.id);
    setMessages([]);
    setActiveArtifact(null);
  };

  const toggleProvider = async (newProvider: Provider) => {
    setProvider(newProvider);
    await fetch('http://localhost:8000/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: newProvider }),
    });
  };

  /* ---- shared assistant request (used by send + regenerate) ---- */
  const runAssistant = async (text: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession, message: text, skill: skill }),
      });
      const data = await res.json();
      const at = messagesRef.current.length;
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response, ts: Date.now() }]);
      setStreamIdx(at);

      if (data.response.includes('```') || skill === 'ship30for30') {
        setActiveArtifact(data.response);
      }

      fetch('http://localhost:8000/api/sessions')
        .then((sRes) => sRes.json())
        .then((sData) => setSessions(sData))
        .catch(() => {});
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Error communicating with backend server.', ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession || loading) return;
    const userText = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages((prev) => [...prev, { role: 'user', content: userText, ts: Date.now() }]);
    await runAssistant(userText);
  };

  const regenerate = async () => {
    if (loading || !activeSession) return;
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx < 0) return;
    const text = messages[lastUserIdx].content;
    setMessages((prev) => prev.slice(0, lastUserIdx + 1));
    await runAssistant(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const moveSession = (dir: number) => {
    if (!sessions.length) return;
    const idx = sessions.findIndex((s) => s.id === activeSession);
    const next = Math.max(0, Math.min(sessions.length - 1, (idx < 0 ? 0 : idx) + dir));
    const s = sessions[next];
    if (s) {
      setActiveSession(s.id);
      setActiveArtifact(null);
    }
  };

  /* ---- global keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewSession();
        return;
      }
      if (e.key === 'Escape') {
        if (paletteOpen) return; // palette handles its own Esc
        if (activeArtifact) setActiveArtifact(null);
        return;
      }
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea';
      if (!typing && !paletteOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        moveSession(e.key === 'ArrowDown' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteOpen, activeArtifact, sessions, activeSession]);

  const onTimelineScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(dist > 260);
  };

  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf('assistant');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] font-sans text-[var(--text)]">
      {/* ===================== SIDEBAR ===================== */}
      {collapsed ? (
        <aside className="flex w-14 shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--panel)] py-4">
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="mb-4 flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-white/5 hover:text-[var(--text)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button
            onClick={createNewSession}
            aria-label="New chat"
            className="accent-bg mb-4 flex h-8 w-8 items-center justify-center rounded-md transition hover:brightness-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
            {sessions.map((s) => {
              const active = activeSession === s.id;
              return (
                <button
                  key={s.id}
                  title={s.title}
                  onClick={() => {
                    setActiveSession(s.id);
                    setActiveArtifact(null);
                  }}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${
                    active ? 'bg-[var(--elevated)] text-[var(--accent-dim)]' : 'text-[var(--text-faint)] hover:bg-white/5 hover:text-[var(--text)]'
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--elevated)] text-[10px] font-semibold text-[var(--text-muted)]">
            LB
          </div>
        </aside>
      ) : (
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
          {/* Brand */}
          <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-[18px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[13px] font-extrabold text-[var(--accent-fg)]">
              L
            </div>
            <div className="leading-none">
              <h1 className="text-[13px] font-semibold tracking-tight text-[var(--text)]">Lenny</h1>
              <p className="label mt-1">Growth Copilot</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-white/5 hover:text-[var(--text)]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-6 px-3 py-4">
            {/* New Chat CTA */}
            <button
              onClick={createNewSession}
              className="accent-bg flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold transition hover:brightness-95"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              New chat
            </button>

            {/* Engine segmented toggle */}
            <div className="px-1">
              <span className="label mb-2 block">Engine</span>
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5">
                <button
                  onClick={() => toggleProvider('ollama')}
                  className={`flex-1 whitespace-nowrap rounded-md py-1.5 text-xs font-medium transition ${
                    provider === 'ollama'
                      ? 'bg-[var(--elevated-2)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
                  }`}
                >
                  Ollama
                </button>
                <button
                  onClick={() => toggleProvider('claude')}
                  className={`flex-1 whitespace-nowrap rounded-md py-1.5 text-xs font-medium transition ${
                    provider === 'claude'
                      ? 'bg-[var(--elevated-2)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
                  }`}
                >
                  Claude
                </button>
              </div>
            </div>

            {/* Skill dropdown */}
            <div className="px-1" ref={skillRef}>
              <span className="label mb-2 block">Skill</span>
              <div className="relative">
                <button
                  onClick={() => setSkillOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--elevated)] px-3 py-2.5 text-left text-xs text-[var(--text)] transition hover:border-[var(--border-strong)]"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    <span className="truncate">{activeSkill.label}</span>
                  </span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    className={`shrink-0 text-[var(--text-faint)] transition-transform ${skillOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {skillOpen && (
                  <div className="animate-fade-up absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--elevated-2)] shadow-2xl shadow-black/60">
                    {SKILLS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSkill(s.id);
                          setSkillOpen(false);
                        }}
                        className={`flex w-full flex-col items-start gap-0.5 border-l-2 px-3 py-2.5 text-left transition ${
                          skill === s.id
                            ? 'border-[var(--accent)] bg-white/[0.03]'
                            : 'border-transparent hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className={`text-xs ${skill === s.id ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                          {s.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-faint)]">{s.hint}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sessions timeline */}
            <div className="flex min-h-0 flex-1 flex-col px-1">
              <span className="label mb-2 flex items-center justify-between">
                Sessions
                <span className="nums-tabular text-[var(--text-faint)]">{sessions.length}</span>
              </span>
              <div className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-2">
                {sessions.map((s) => {
                  const active = activeSession === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveSession(s.id);
                        setActiveArtifact(null);
                      }}
                      className={`group relative flex w-full items-center gap-2.5 rounded-md py-2 pl-3 pr-2 text-left text-[13px] transition ${
                        active
                          ? 'bg-[var(--elevated)] text-[var(--text)]'
                          : 'text-[var(--text-muted)] hover:bg-white/[0.03] hover:text-[var(--text)]'
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent)] transition-opacity ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 text-[var(--text-faint)]">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="truncate">{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Signed-in profile footer */}
          <div className="flex items-center gap-2.5 border-t border-[var(--border)] px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--elevated)] text-[11px] font-semibold text-[var(--text-muted)]">
              LB
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-medium text-[var(--text)]">Boss</p>
              <p className="flex items-center gap-1.5 text-[10px] text-[var(--text-faint)]">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Pro workspace
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* ===================== MAIN FEED ===================== */}
      <div className={`flex h-full flex-col bg-[var(--bg)] transition-all duration-300 ${activeArtifact ? 'w-1/2' : 'flex-1'}`}>
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-semibold tracking-tight text-[var(--text)]">Timeline</span>
            {messages.length > 0 && (
              <span className="nums-tabular label border-l border-[var(--border)] pl-2.5">
                {messages.length} msgs
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--elevated)] px-2.5 py-1 text-[var(--text-faint)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span className="kbd">⌘K</span>
            </button>
            <span className="label flex items-center gap-1.5">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {providerLabel}
            </span>
            <span className="label border-l border-[var(--border)] pl-4">{activeSkill.label}</span>
          </div>
        </header>

        {/* Indeterminate loading line */}
        <div className="h-[2px] shrink-0">{loading && <div className="loading-line h-[2px]" />}</div>

        {/* Timeline */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={scrollRef} onScroll={onTimelineScroll} className="h-full overflow-y-auto px-4 py-8 md:px-8">
            <div className="mx-auto w-full max-w-3xl space-y-6">
              {messages.length === 0 && !loading ? (
                <EmptyHero provider={providerLabel} skill={activeSkill.label} onPrompt={(p) => setInput(p)} />
              ) : (
                <>
                  {messages.map((m, idx) => (
                    <MessageBubble
                      key={idx}
                      message={m}
                      engineLabel={providerLabel}
                      stream={idx === streamIdx}
                      onStreamTick={() => scrollToBottom(false)}
                      canRegenerate={idx === lastAssistantIdx && !loading}
                      onRegenerate={regenerate}
                    />
                  ))}
                  {loading && <TypingBubble />}
                </>
              )}
            </div>
          </div>

          {/* Scroll-to-bottom */}
          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom()}
              aria-label="Jump to latest"
              className="animate-fade-up absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--elevated)] text-[var(--text-muted)] shadow-lg shadow-black/50 transition hover:text-[var(--text)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Input dock */}
        <div className="px-4 pb-6 pt-2 md:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="ring-accent flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-2 pl-4 transition">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoGrow();
                }}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask a growth question or request an essay…"
                className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                aria-label="Send"
                className="accent-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[var(--elevated-2)] disabled:text-[var(--text-faint)]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between px-1">
              <span className="label">{activeSkill.label} · {providerLabel}</span>
              <span className="label flex items-center gap-1.5">
                <kbd className="kbd">Enter</kbd> send
                <kbd className="kbd ml-1.5">⇧ Enter</kbd> newline
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== ARTIFACT CANVAS ===================== */}
      <ArtifactCanvas content={activeArtifact} onClose={() => setActiveArtifact(null)} />

      {/* ===================== COMMAND PALETTE ===================== */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        sessions={sessions}
        onSelectSession={(id) => {
          setActiveSession(id);
          setActiveArtifact(null);
        }}
        onNewChat={createNewSession}
        onToggleProvider={toggleProvider}
        onSetSkill={setSkill}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */
function MessageBubble({
  message,
  engineLabel,
  stream,
  onStreamTick,
  canRegenerate,
  onRegenerate,
}: {
  message: Message;
  engineLabel: string;
  stream: boolean;
  onStreamTick: () => void;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const isUser = message.role === 'user';
  const isError = /^(❌|error:)/i.test(message.content.trim());
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(stream ? 0 : message.content.length);

  useEffect(() => {
    if (!stream) {
      setRevealed(message.content.length);
      return;
    }
    setRevealed(0);
    let i = 0;
    const total = message.content.length;
    const step = Math.max(2, Math.round(total / 140));
    const id = setInterval(() => {
      i += step;
      if (i >= total) {
        i = total;
        clearInterval(id);
      }
      setRevealed(i);
      onStreamTick();
    }, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, message.content]);

  const shown = message.content.slice(0, revealed);
  const streaming = stream && revealed < message.content.length;

  const copy = () => {
    navigator.clipboard?.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <div className="animate-fade-up group flex items-center justify-end gap-2.5">
        {message.ts && (
          <span className="label opacity-0 transition group-hover:opacity-100">{relativeTime(message.ts)}</span>
        )}
        <div className="max-w-2xl rounded-2xl rounded-br-sm bg-[#fafafa] px-4 py-2.5 text-sm leading-relaxed text-[#0a0a0b] shadow-lg shadow-black/40">
          <p className="whitespace-pre-wrap font-medium">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up group flex justify-start gap-3">
      {/* Assistant monogram */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--elevated)] text-[11px] font-bold text-[var(--accent-dim)]">
        L
      </div>

      <div className="min-w-0 max-w-[85%] flex-1">
        {/* Identity row */}
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-[var(--text)]">Lenny</span>
          {isError ? (
            <span className="danger-text label">Error</span>
          ) : (
            <span className="label">{engineLabel}</span>
          )}
          {message.ts && (
            <span className="label opacity-0 transition group-hover:opacity-100">{relativeTime(message.ts)}</span>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            {canRegenerate && (
              <button onClick={onRegenerate} className="label flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:text-[var(--text)]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Retry
              </button>
            )}
            <button onClick={copy} className="label flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:text-[var(--text)]">
              {copied ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Answer */}
        <div className={`rounded-xl rounded-tl-sm border border-[var(--border)] bg-[var(--elevated)] px-4 py-3.5 ${isError ? 'danger' : ''}`}>
          <div className={`md ${isError ? 'danger-text' : ''}`}>
            <Markdown>{shown}</Markdown>
            {streaming && <span className="caret" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="animate-fade-up flex justify-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--elevated)] text-[11px] font-bold text-[var(--accent-dim)]">
        L
      </div>
      <div className="flex items-center gap-3 rounded-xl rounded-tl-sm border border-[var(--border)] bg-[var(--elevated)] px-4 py-3.5">
        <span className="flex items-center gap-1.5">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent-dim)]" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent-dim)]" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent-dim)]" />
        </span>
        <span className="label">Searching transcripts</span>
      </div>
    </div>
  );
}

function EmptyHero({
  provider,
  skill,
  onPrompt,
}: {
  provider: string;
  skill: string;
  onPrompt: (p: string) => void;
}) {
  const suggestions = [
    'What are the top drivers of activation for SaaS products?',
    'Summarize the AARRR pirate metrics framework',
    'Write an atomic essay on why retention beats acquisition',
    'How do great PMs prioritize their roadmap?',
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] text-lg font-extrabold text-[var(--accent-fg)]">
        L
      </div>
      <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">Ask anything about growth</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
        Grounded in Lenny's podcast transcripts. Running <span className="text-[var(--text)]">{provider}</span> ·{' '}
        <span className="accent-text">{skill}</span>.
      </p>

      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPrompt(s)}
            className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--elevated)]"
          >
            <span className="text-[13px] leading-snug text-[var(--text-muted)] transition group-hover:text-[var(--text)]">
              {s}
            </span>
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="ml-auto shrink-0 text-[var(--text-faint)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}