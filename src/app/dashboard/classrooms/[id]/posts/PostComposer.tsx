"use client";

import Link from "next/link";
import { useState } from "react";
import { createPost, saveTemplate, updatePost } from "./actions";

export type Template = {
  id: string;
  title: string;
  content: string;
  items: string[];
};

type Initial = {
  postId: string;
  title: string;
  content: string;
  items: string; // 줄바꿈 구분
  postDate: string;
  publishMode: "now" | "schedule";
  publishLocal: string; // datetime-local 값
};

// 로컬 Date → datetime-local 문자열
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PostComposer({
  classroomId,
  templates,
  today,
  initial,
}: {
  classroomId: string;
  templates: Template[];
  today: string;
  initial?: Initial;
}) {
  const editing = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [items, setItems] = useState(initial?.items ?? "");
  const [postDate, setPostDate] = useState(initial?.postDate ?? today);
  const [mode, setMode] = useState<"now" | "schedule">(initial?.publishMode ?? "now");
  const [publishLocal, setPublishLocal] = useState(initial?.publishLocal ?? "");

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.title);
    setContent(t.content);
    setItems(t.items.join("\n"));
  };

  // 기본 예약 시각 후보: 내일 오전 8시
  const defaultSchedule = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return toLocalInput(d);
  };
  const nowLocal = toLocalInput(new Date());

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">
          {editing ? "알림장 수정" : "알림장 쓰기"}
        </h2>
        {editing && (
          <Link
            href={`/dashboard/classrooms/${classroomId}/posts`}
            className="text-sm text-ink-faint underline decoration-line-strong underline-offset-2 hover:text-ink-soft"
          >
            수정 취소
          </Link>
        )}
      </div>

      {/* 템플릿 불러오기 */}
      {!editing && templates.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 rounded-lg bg-paper-soft p-2 text-sm text-ink-soft">
          템플릿 불러오기
          <select
            defaultValue=""
            onChange={(e) => {
              applyTemplate(e.target.value);
              e.target.value = "";
            }}
            className="rounded-lg border border-line bg-paper p-1.5 text-ink"
          >
            <option value="" disabled>
              선택
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <span className="text-xs text-ink-faint">불러온 뒤 자유롭게 고칠 수 있어요.</span>
        </label>
      )}

      <form action={editing ? updatePost : createPost} className="flex flex-col gap-3">
        <input type="hidden" name="classroom_id" value={classroomId} />
        {editing && <input type="hidden" name="post_id" value={initial!.postId} />}

        <div className="flex gap-2">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            날짜
            <input
              type="date"
              name="post_date"
              required
              value={postDate}
              onChange={(e) => setPostDate(e.target.value)}
              className="rounded-lg border border-line bg-paper-soft p-2 text-ink"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-ink-soft">
            제목
            <input
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="7월 9일 알림장"
              className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          내용
          <textarea
            name="content"
            required
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"1. 우유급식 신청서 제출\n2. 목요일 현장체험학습"}
            className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          준비물 체크리스트 (선택 — 한 줄에 하나씩)
          <textarea
            name="items"
            rows={3}
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder={"색연필\n가위"}
            className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
          />
        </label>

        {/* 게시 시점 */}
        <fieldset className="flex flex-col gap-2 rounded-lg bg-paper-soft p-3 text-sm">
          <legend className="px-1 text-ink-soft">게시 시점</legend>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1.5 text-ink">
              <input
                type="radio"
                name="publish_mode"
                value="now"
                checked={mode === "now"}
                onChange={() => setMode("now")}
                className="accent-ink"
              />
              지금 게시
            </label>
            <label className="flex items-center gap-1.5 text-ink">
              <input
                type="radio"
                name="publish_mode"
                value="schedule"
                checked={mode === "schedule"}
                onChange={() => {
                  setMode("schedule");
                  if (!publishLocal) setPublishLocal(defaultSchedule());
                }}
                className="accent-ink"
              />
              예약 게시
            </label>
          </div>
          {mode === "schedule" && (
            <label className="flex flex-col gap-1 text-ink-soft">
              공개할 날짜·시각
              <input
                type="datetime-local"
                name="publish_local"
                value={publishLocal}
                min={nowLocal}
                onChange={(e) => setPublishLocal(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-line bg-paper p-2 text-ink"
              />
              <span className="text-xs text-ink-faint">
                이 시각이 되면 학생 화면에 자동으로 나타나요. 그 전까진 학생에게 안 보여요.
              </span>
            </label>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            {editing ? "수정 저장" : mode === "schedule" ? "예약하기" : "등록"}
          </button>
          {!editing && (
            <button
              type="submit"
              formAction={saveTemplate}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
            >
              이 내용을 템플릿으로 저장
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
