'use client';

import React, { useState } from 'react';
import Markdown from './Markdown';

interface ArtifactCanvasProps {
  content: string | null;
  onClose: () => void;
}

export default function ArtifactCanvas({ content, onClose }: ArtifactCanvasProps) {
  const [raw, setRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const isHtml = content.trim().startsWith('<') || content.includes('<!DOCTYPE html>');
  const fileName = isHtml ? 'rendered_preview.html' : 'ship30_essay.md';
  const format = isHtml ? 'HTML' : 'MARKDOWN';
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const copy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([content], { type: isHtml ? 'text/html' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="animate-slide-in flex h-full w-1/2 flex-col border-l border-[var(--border)] bg-[var(--panel)]">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--elevated)] text-[var(--accent-dim)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold tracking-tight text-[var(--text)]">Canvas</span>
              <span className="label flex items-center gap-1.5 text-[var(--accent-dim)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Ready
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="truncate font-mono text-[11px] text-[var(--text-muted)]">{fileName}</span>
              <span className="label">{format}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isHtml && (
            <button
              onClick={() => setRaw((r) => !r)}
              className="rounded-md border border-[var(--border)] bg-[var(--elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            >
              {raw ? 'Rendered' : 'Raw'}
            </button>
          )}
          <button
            onClick={copy}
            aria-label="Copy"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--elevated)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button
            onClick={download}
            aria-label="Download"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--elevated)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
          <button
            onClick={onClose}
            aria-label="Close canvas"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--elevated)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Viewer */}
      <div className="flex-1 overflow-y-auto p-8">
        {isHtml ? (
          <iframe
            title="Artifact Preview"
            srcDoc={content}
            className="min-h-[70vh] w-full rounded-lg border border-[var(--border)] bg-white"
          />
        ) : raw ? (
          <pre className="mx-auto max-w-2xl overflow-x-auto rounded-xl border border-[var(--border)] bg-[#08080a] p-6 font-mono text-xs leading-relaxed text-[var(--text-muted)]">
            {content}
          </pre>
        ) : (
          <div className="mx-auto max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-9">
            <article className="md essay">
              <Markdown>{content}</Markdown>
            </article>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-[var(--border)] px-5 py-2.5">
        <span className="label nums-tabular">{wordCount} words</span>
        <span className="label flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Artifact Canvas
        </span>
      </footer>
    </aside>
  );
}