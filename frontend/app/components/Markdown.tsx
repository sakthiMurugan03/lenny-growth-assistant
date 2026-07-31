'use client';

import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

/* Code block with its own header bar + per-block copy button */
function CodeBlock({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const text = ref.current?.innerText ?? '';
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="cb">
      <div className="cb-bar">
        <span className="cb-dots">
          <i />
          <i />
          <i />
        </span>
        <button onClick={copy} className="cb-copy">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre ref={ref}>{children}</pre>
    </div>
  );
}

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{ pre: ({ children }) => <CodeBlock>{children}</CodeBlock> }}
    >
      {children}
    </ReactMarkdown>
  );
}