"use client";

import Link from "next/link";
import { useState } from "react";
import { TagInput } from "@/components/TagInput";
import { updateRecord } from "./actions";

// 기록 카드 한 건의 내용(메모)·태그·날짜를 그 자리에서 수정.
// 보기 모드에서는 서버 렌더와 동일하게 내용/태그를 보여주고,
// '수정'을 누르면 폼으로 바뀐다. 저장하면 서버 액션이 리다이렉트하며 초기화된다.
export function RecordEditor({
  classroomId,
  recordId,
  back,
  content,
  tags,
  recordDate,
  tagLinks,
  existingTags,
  isLinked,
}: {
  classroomId: string;
  recordId: string;
  back: string;
  content: string | null;
  tags: string[];
  recordDate: string;
  tagLinks: { tag: string; href: string }[];
  existingTags: string[];
  isLinked: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex flex-col gap-1.5">
        {content && (
          <p className="whitespace-pre-wrap text-sm text-ink">{content}</p>
        )}
        {tagLinks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tagLinks.map((t) => (
              <Link
                key={t.tag}
                href={t.href}
                className="rounded-full bg-paper-soft px-2 py-0.5 text-xs text-ink-soft transition-colors hover:bg-line hover:text-ink"
              >
                #{t.tag}
              </Link>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="self-start text-xs text-ink-faint underline decoration-line underline-offset-2 transition-colors hover:text-ink"
        >
          수정
        </button>
      </div>
    );
  }

  return (
    <form action={updateRecord} className="flex flex-col gap-2">
      <input type="hidden" name="classroom_id" value={classroomId} />
      <input type="hidden" name="record_id" value={recordId} />
      <input type="hidden" name="back" value={back} />
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        날짜
        <input
          type="date"
          name="record_date"
          required
          defaultValue={recordDate}
          className="self-start rounded-lg border border-line bg-paper-soft p-2 text-sm text-ink"
        />
      </label>
      <textarea
        name="content"
        rows={3}
        defaultValue={content ?? ""}
        placeholder="기록 내용 (이 화면에서만 보입니다)"
        className="rounded-lg border border-line bg-paper-soft p-2 text-sm text-ink placeholder:text-ink-faint"
      />
      <TagInput existingTags={existingTags} defaultValue={tags.map((t) => `#${t}`).join(" ")} />
      {isLinked && (
        <p className="text-xs text-ink-faint">
          ↔ 갈등 기록이라 양쪽 학생의 기록이 함께 수정됩니다.
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-ink/85"
        >
          저장
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
        >
          취소
        </button>
      </div>
    </form>
  );
}
