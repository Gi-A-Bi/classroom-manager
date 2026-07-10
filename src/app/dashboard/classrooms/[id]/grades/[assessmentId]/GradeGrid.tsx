"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveResults } from "../actions";

type Student = { id: string; number: number; nickname: string };
type Assessment = {
  id: string;
  kind: "score" | "level" | "text";
  max_score: number | null;
  levels: string[] | null;
};

// 점수 입력 그리드 — 셀 수정 즉시 저장, Enter로 다음 학생,
// 엑셀 열 붙여넣기(줄바꿈 구분)를 현재 셀부터 아래로 채움.
export function GradeGrid({
  assessment,
  students,
  initialValues,
}: {
  assessment: Assessment;
  students: Student[];
  initialValues: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saved, setSaved] = useState<Record<string, "ok" | "saving">>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);

  const persist = (entries: { studentId: string; value: string }[]) => {
    setError(null);
    setSaved((prev) => {
      const next = { ...prev };
      for (const e of entries) next[e.studentId] = "saving";
      return next;
    });
    startTransition(async () => {
      const result = await saveResults({ assessmentId: assessment.id, entries });
      if (!result.ok) {
        setError(result.error ?? "저장에 실패했습니다.");
        setSaved((prev) => {
          const next = { ...prev };
          for (const e of entries) delete next[e.studentId];
          return next;
        });
        return;
      }
      setSaved((prev) => {
        const next = { ...prev };
        for (const e of entries) next[e.studentId] = "ok";
        return next;
      });
      router.refresh();
    });
  };

  const commitCell = (studentId: string, value: string) => {
    if ((initialValues[studentId] ?? "") === value && saved[studentId] !== "saving") {
      // 값이 그대로면 저장 생략 (단, 화면 상태는 유지)
      if (values[studentId] === (initialValues[studentId] ?? "")) return;
    }
    persist([{ studentId, value }]);
  };

  const handlePaste = (startIndex: number, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n") && !text.includes("\t")) return; // 단일 값은 기본 동작
    e.preventDefault();

    const pasted = text
      .split(/\r?\n/)
      .map((line) => line.split("\t")[0].trim())
      .filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ""));

    // entries는 updater 밖에서 계산 (setState updater는 지연 실행되므로)
    const patch: Record<string, string> = {};
    const entries: { studentId: string; value: string }[] = [];
    pasted.forEach((v, offset) => {
      const student = students[startIndex + offset];
      if (student) {
        patch[student.id] = v;
        entries.push({ studentId: student.id, value: v });
      }
    });
    setValues((prev) => ({ ...prev, ...patch }));
    if (entries.length > 0) persist(entries);
  };

  const focusNext = (index: number) => {
    inputRefs.current[index + 1]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <p className="text-xs text-ink-faint">
        입력하면 바로 저장돼요. Enter로 다음 학생,{" "}
        {assessment.kind !== "level" &&
          "엑셀에서 복사한 열을 첫 칸에 붙여넣으면 아래로 한 번에 채워집니다."}
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {students.map((s, i) => {
          const state = saved[s.id];
          return (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-xl border border-line bg-paper p-2 pl-3 text-sm"
            >
              <span className="w-20 shrink-0 truncate text-ink">
                <span className="font-bold tabular-nums text-ink-faint">
                  {s.number}
                </span>{" "}
                {s.nickname}
              </span>
              {assessment.kind === "level" ? (
                <select
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  value={values[s.id] ?? ""}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [s.id]: e.target.value }));
                    persist([{ studentId: s.id, value: e.target.value }]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNext(i);
                    }
                  }}
                  className="flex-1 rounded-lg border p-1.5"
                >
                  <option value="">-</option>
                  {(assessment.levels ?? []).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode={assessment.kind === "score" ? "decimal" : "text"}
                  value={values[s.id] ?? ""}
                  placeholder={
                    assessment.kind === "score"
                      ? assessment.max_score !== null
                        ? `/${assessment.max_score}`
                        : "점수"
                      : "내용"
                  }
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [s.id]: e.target.value }))
                  }
                  onBlur={(e) => commitCell(s.id, e.target.value.trim())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitCell(s.id, (e.target as HTMLInputElement).value.trim());
                      focusNext(i);
                    }
                  }}
                  onPaste={(e) => handlePaste(i, e)}
                  className="min-w-0 flex-1 rounded-lg border p-1.5"
                />
              )}
              <span className="w-5 shrink-0 text-center text-xs">
                {state === "saving" ? (
                  <span className="text-gray-300">…</span>
                ) : state === "ok" ? (
                  <span className="font-bold text-green-500">✓</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
