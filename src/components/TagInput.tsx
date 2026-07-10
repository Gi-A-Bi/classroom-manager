"use client";

import { useState } from "react";

// 태그 자유 입력 + 기존 태그 클릭으로 추가
export function TagInput({
  existingTags,
  defaultValue,
}: {
  existingTags: string[];
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  const appendTag = (tag: string) => {
    setValue((prev) => {
      const tags = prev.split(/[\s,]+/).filter(Boolean);
      if (tags.includes(`#${tag}`) || tags.includes(tag)) return prev;
      return prev.trim() ? `${prev.trim()} #${tag}` : `#${tag}`;
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="text"
        name="tags"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="#연구부 #생활지도 (띄어쓰기로 구분)"
        className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
      />
      {existingTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {existingTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => appendTag(tag)}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition-colors hover:bg-slate-200"
            >
              + #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
