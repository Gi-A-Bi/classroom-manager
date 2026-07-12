"use client";

// 인쇄 전에 자유롭게 입력하는 칸. 비워두면 인쇄 후 손으로 적을 수 있게 빈 칸.
// (저장은 하지 않는다 — 주간학습안내는 대개 한 주에 한 번 인쇄)
export function EditableNote() {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="가정 안내 입력"
      data-placeholder="여기에 준비물·안내 사항을 입력하거나, 인쇄 후 손으로 적으세요."
      className="min-h-16 rounded-md border border-dashed border-line-strong p-2 text-sm text-ink outline-none focus:border-line-ink empty:before:text-ink-faint empty:before:content-[attr(data-placeholder)] print:min-h-20 print:border-solid"
    />
  );
}
