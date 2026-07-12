"use client";

import { Printer } from "lucide-react";

// 브라우저 인쇄(= PDF 저장) 트리거. 인쇄 대화상자에서 "PDF로 저장"도 됨.
export function PrintButton({ label = "인쇄 / PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
    >
      <Printer size={15} strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );
}
