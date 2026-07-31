'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Session {
  id: string;
  title: string;
}

interface Item {
  id: string;
  label: string;
  hint?: string;
  group: 'Actions' | 'Engine' | 'Skill' | 'Sessions';
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onToggleProvider: (p: 'ollama' | 'claude') => void;
  onSetSkill: (s: 'qa' | 'ship30for30') => void;
}

export default function CommandPalette({
  open,
  onClose,
  sessions,
  onSelectSession,
  onNewChat,
  onToggleProvider,
  onSetSkill,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items: Item[] = useMemo(() => {
    const base: Item[] = [
      { id: 'new', label: 'New chat', hint: '⌘N', group: 'Actions', run: onNewChat },
      { id: 'eng-ollama', label: 'Switch to Local Ollama', group: 'Engine', run: () => onToggleProvider('ollama') },
      { id: 'eng-claude', label: 'Switch to Claude API', group: 'Engine', run: () => onToggleProvider('claude') },
      { id: 'skill-qa', label: 'Skill: Grounded Transcript Q&A', group: 'Skill', run: () => onSetSkill('qa') },
      { id: 'skill-ship', label: 'Skill: Ship30for30 Atomic Essay', group: 'Skill', run: () => onSetSkill('ship30for30') },
      ...sessions.map((s) => ({
        id: `sess-${s.id}`,
        label: s.title || 'Untitled session',
        group: 'Sessions' as const,
        run: () => onSelectSession(s.id),
      })),
    ];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((i) => i.label.toLowerCase().includes(q));
  }, [query, sessions, onNewChat, onToggleProvider, onSetSkill, onSelectSession]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const choose = (i: number) => {
    const item = items[i];
    if (!item) return;
    item.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--elevated)] shadow-2xl shadow-black/70"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search */}
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-[var(--text-faint)]">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions or run a command…"
            className="w-full bg-transparent py-3.5 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none"
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-faint)]">No matches</div>
          )}
          {items.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <React.Fragment key={item.id}>
                {showGroup && <div className="label px-4 pb-1 pt-3">{item.group}</div>}
                <button
                  data-active={active === i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`relative flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
                    active === i ? 'bg-white/[0.05] text-[var(--text)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent)] transition-opacity ${
                      active === i ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.hint && <kbd className="kbd ml-auto">{item.hint}</kbd>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}