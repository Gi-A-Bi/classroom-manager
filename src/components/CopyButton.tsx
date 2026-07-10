"use client";

import { useState } from "react";

// 클립보드 복사 버튼 — 스니펫의 핵심 동작이라 크고 빠르게
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API를 못 쓰는 환경(http 등) 폴백
      const ta = document.createElement("textarea");
      ta.value = text;
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
      className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-slate-700 text-white hover:bg-slate-800"
      }`}
    >
      {copied ? "✓ 복사됨!" : "📋 복사"}
    </button>
  );
}
