"use client";

import { useState } from "react";

// 파괴적 동작용 2단계 확인 버튼. <form action={serverAction}> 안에서 쓴다.
// 첫 클릭 → "정말요? [취소][확인]" 노출 → 확인 클릭 시 폼 제출.
export function ConfirmSubmit({
  children,
  confirmLabel = "확인",
  question = "정말요?",
  className = "",
  confirmClassName = "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700",
}: {
  children: React.ReactNode;
  confirmLabel?: string;
  question?: string;
  className?: string;
  confirmClassName?: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={className}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-ink-soft">{question}</span>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
      >
        취소
      </button>
      <button type="submit" className={confirmClassName}>
        {confirmLabel}
      </button>
    </span>
  );
}
