"use client";

import { useState } from "react";
import { parseScheduleText, type ParsedRow } from "@/lib/schedule-parse";
import { bulkCreateEvents } from "./actions";

// 한글/엑셀에서 복사한 학사일정 표를 붙여넣어 일괄 등록하는 위젯.
// 파싱은 브라우저에서, 저장은 서버 액션(RLS 적용)에서 처리한다.
export function BulkScheduleImport({
  classroomId,
  academicYear,
  month,
}: {
  classroomId: string;
  academicYear: number;
  month: string;
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);

  const updateRow = (i: number, patch: Partial<ParsedRow>) => {
    setRows((prev) =>
      prev ? prev.map((r, j) => (j === i ? { ...r, ...patch } : r)) : prev,
    );
  };

  const removeRow = (i: number) => {
    setRows((prev) => (prev ? prev.filter((_, j) => j !== i) : prev));
  };

  const readyRows = (rows ?? []).filter((r) => r.start && r.title.trim());
  const pendingRows = (rows ?? []).filter((r) => !r.start || !r.title.trim());

  return (
    <details className="rounded-2xl border border-line bg-paper open:pb-5">
      <summary className="cursor-pointer px-5 py-4 font-semibold text-ink transition-colors hover:bg-paper-soft">
        학사일정 붙여넣기{" "}
        <span className="text-sm font-normal text-ink-faint">
          한글·엑셀 표를 복사해서 한 번에 등록
        </span>
      </summary>

      <div className="flex flex-col gap-3 px-5">
        {rows === null ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"3/2 입학식\n3월 5일 학부모 총회\n7/21~8/24 여름방학"}
              className="rounded-lg border border-line bg-paper-soft p-3 font-mono text-sm text-ink placeholder:text-ink-faint"
            />
            <button
              type="button"
              onClick={() => setRows(parseScheduleText(text, academicYear))}
              disabled={text.trim().length === 0}
              className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-40"
            >
              날짜 인식하기
            </button>
            <p className="text-xs text-ink-faint">
              지원 형식: 3/2 · 3월 2일 · 3.2.(월) · 기간 7/21~8/24 (연도는{" "}
              {academicYear}학년도 기준, 1~2월은 {academicYear + 1}년으로 인식)
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              <strong className="text-blue-700">{readyRows.length}건</strong>{" "}
              인식됨
              {pendingRows.length > 0 && (
                <>
                  {" "}
                  · <strong className="text-amber-600">
                    {pendingRows.length}건
                  </strong>{" "}
                  은 날짜를 직접 입력해주세요
                </>
              )}
              . 확인 후 등록을 누르면{" "}
              <span className="rounded bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-800">
                학교
              </span>{" "}
              일정으로 저장됩니다.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-faint">
                    <th className="p-2">시작일</th>
                    <th className="p-2">종료일(기간)</th>
                    <th className="p-2">행사명</th>
                    <th className="w-10 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-b border-line transition-colors ${!r.start || !r.title.trim() ? "bg-amber-50" : ""}`}
                    >
                      <td className="p-1.5">
                        <input
                          type="date"
                          value={r.start ?? ""}
                          onChange={(e) =>
                            updateRow(i, { start: e.target.value || null })
                          }
                          className="rounded-md border border-line bg-paper-soft p-1.5 text-ink"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="date"
                          value={r.end ?? ""}
                          onChange={(e) =>
                            updateRow(i, { end: e.target.value || null })
                          }
                          className="rounded-md border border-line bg-paper-soft p-1.5 text-ink"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={r.title}
                          onChange={(e) => updateRow(i, { title: e.target.value })}
                          placeholder="행사명"
                          className="w-full min-w-40 rounded-md border border-line bg-paper-soft p-1.5 text-ink placeholder:text-ink-faint"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          title="이 줄 빼기"
                          className="rounded-md px-2 py-1 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2">
              <form action={bulkCreateEvents}>
                <input type="hidden" name="classroom_id" value={classroomId} />
                <input type="hidden" name="month" value={month} />
                <input
                  type="hidden"
                  name="payload"
                  value={JSON.stringify(
                    readyRows.map((r) => ({
                      title: r.title,
                      start: r.start,
                      end: r.end,
                    })),
                  )}
                />
                <button
                  type="submit"
                  disabled={readyRows.length === 0}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-40"
                >
                  {readyRows.length}건 일괄 등록
                </button>
              </form>
              <button
                type="button"
                onClick={() => setRows(null)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
              >
                다시 붙여넣기
              </button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
