"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

// 학급코드 칩 — 고정폭·자간 넓게. 클릭하면 클립보드 복사 + "복사됨" 피드백.
export function CopyCodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="학급코드 복사"
      className="group inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 transition-colors hover:bg-paper-soft"
    >
      <span className="text-[11px] font-medium text-ink-faint">학급코드</span>
      <span className="font-mono text-base font-bold tracking-[0.25em] text-ink">
        {code}
      </span>
      {copied ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
          <Check size={14} strokeWidth={2.5} aria-hidden />
          복사됨
        </span>
      ) : (
        <Copy
          size={15}
          strokeWidth={1.75}
          className="text-ink-faint group-hover:text-ink-soft"
          aria-hidden
        />
      )}
    </button>
  );
}
