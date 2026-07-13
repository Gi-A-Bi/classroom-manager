"use client";

import { useEffect, useRef, useState } from "react";
import { addQuickRecord } from "@/app/dashboard/classrooms/[id]/records/actions";
import { BUILTIN_TYPES, type BuiltinType } from "@/lib/record-types";

type Student = { id: string; number: number; nickname: string };
type CustomType = { id: string; label: string };

// 커스텀 유형도 내장 유형처럼 다룬다(플로우는 memo=한 줄 메모)
function customAsType(c: CustomType): BuiltinType {
  return { key: "custom", label: c.label, chip: "bg-purple-100 text-purple-700", flow: "memo" };
}

export function QuickRecord({
  classroomId,
  students,
  subjects,
  customTypes,
}: {
  classroomId: string;
  students: Student[];
  subjects: string[];
  customTypes: CustomType[];
}) {
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [type, setType] = useState<BuiltinType | null>(null); // 세부 입력 단계에 들어간 유형
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const memoRef = useRef<HTMLInputElement>(null);

  // 팝업 닫힐 때 초기화
  useEffect(() => {
    if (!open) {
      setStudent(null);
      setType(null);
      setMemo("");
    }
  }, [open]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (type) setType(null);
        else if (student) setStudent(null);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, type, student]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function save(opts: {
    recordType: string;
    detail?: string | null;
    peerStudentId?: string | null;
    withMemo?: boolean;
  }) {
    if (!student || saving) return;
    setSaving(true);
    const res = await addQuickRecord({
      classroomId,
      studentId: student.id,
      recordType: opts.recordType,
      detail: opts.detail ?? null,
      memo: opts.withMemo ? memo : null,
      peerStudentId: opts.peerStudentId ?? null,
    });
    setSaving(false);
    if (res.ok) {
      flash("✓ " + res.message);
      // 같은 학생으로 연속 기록 가능하게 학생은 유지, 세부·메모만 초기화
      setType(null);
      setMemo("");
    } else {
      flash("⚠ " + res.message);
    }
  }

  // 유형 버튼 클릭
  function pickType(t: BuiltinType) {
    if (t.flow === "simple") {
      save({ recordType: t.key });
    } else {
      setType(t);
      setMemo("");
      if (t.flow === "memo") setTimeout(() => memoRef.current?.focus(), 30);
    }
  }

  const allTypes: BuiltinType[] = [...BUILTIN_TYPES, ...customTypes.map(customAsType)];

  return (
    <>
      {/* 상시 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-paper shadow-lg shadow-ink/25 transition-transform hover:scale-105 active:scale-95 print:hidden"
        aria-label="빠른 기록"
      >
        <span className="text-lg leading-none">✎</span>
        빠른 기록
      </button>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-lg print:hidden">
          {toast}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4 print:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-ink">빠른 기록</span>
                {student && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudent(null);
                      setType(null);
                    }}
                    className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-paper"
                  >
                    {student.number}번 {student.nickname} ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-ink-faint hover:bg-paper-soft hover:text-ink"
              >
                닫기
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* 1단계: 학생 선택 (팝업 열리면 바로 이 그리드) */}
              {!student && (
                <>
                  <p className="mb-2 text-xs font-bold tracking-wide text-ink-faint">
                    학생을 골라주세요
                  </p>
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStudent(s)}
                        title={s.nickname}
                        className="flex aspect-square flex-col items-center justify-center rounded-xl border border-line bg-paper text-ink transition-colors hover:border-ink hover:bg-paper-soft"
                      >
                        <span className="text-base font-semibold tabular-nums">
                          {s.number}
                        </span>
                        <span className="max-w-full truncate px-0.5 text-[10px] text-ink-faint">
                          {s.nickname}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 2단계: 유형 선택 */}
              {student && !type && (
                <>
                  <p className="mb-2 text-xs font-bold tracking-wide text-ink-faint">
                    유형을 눌러 저장 · 세부가 있으면 이어서 선택
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {allTypes.map((t, i) => (
                      <button
                        key={t.key === "custom" ? `c${i}` : t.key}
                        type="button"
                        disabled={saving}
                        onClick={() => pickType(t)}
                        className={`rounded-xl px-3 py-3 text-left text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${t.chip}`}
                      >
                        {t.label}
                        {t.flow !== "simple" && (
                          <span className="ml-1 text-xs font-normal opacity-70">›</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 3단계: 세부 입력 */}
              {student && type && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${type.chip}`}>
                      {type.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setType(null)}
                      className="text-xs text-ink-faint hover:text-ink"
                    >
                      ← 유형 다시
                    </button>
                  </div>

                  {/* 숙제 미제출: 과목 선택 */}
                  {type.flow === "subject" && (
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.length === 0 && (
                        <span className="text-sm text-ink-soft">
                          등록된 과목이 없어요. 아래 저장을 누르면 과목 없이 기록됩니다.
                        </span>
                      )}
                      {subjects.map((name) => (
                        <button
                          key={name}
                          type="button"
                          disabled={saving}
                          onClick={() => save({ recordType: type.key, detail: name, withMemo: true })}
                          className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink hover:bg-paper-soft disabled:opacity-50"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 칭찬·건강: 정해진 세부 */}
                  {type.flow === "subs" && type.subs && (
                    <div className="flex flex-wrap gap-1.5">
                      {type.subs.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          disabled={saving}
                          onClick={() => save({ recordType: type.key, detail: sub, withMemo: true })}
                          className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink hover:bg-paper-soft disabled:opacity-50"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 갈등: 상대 학생 선택 → 양쪽 상호 기록 */}
                  {type.flow === "peer" && (
                    <>
                      <p className="text-xs text-ink-soft">
                        상대 학생을 고르면 양쪽 기록에 서로 연결되어 저장돼요.
                      </p>
                      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                        {students
                          .filter((s) => s.id !== student.id)
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              disabled={saving}
                              onClick={() => save({ recordType: type.key, peerStudentId: s.id, withMemo: true })}
                              title={s.nickname}
                              className="flex aspect-square flex-col items-center justify-center rounded-xl border border-line bg-paper text-ink transition-colors hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
                            >
                              <span className="text-base font-semibold tabular-nums">{s.number}</span>
                              <span className="max-w-full truncate px-0.5 text-[10px] text-ink-faint">
                                {s.nickname}
                              </span>
                            </button>
                          ))}
                      </div>
                    </>
                  )}

                  {/* 한 줄 메모 (모든 세부 플로우 공통, 선택) */}
                  <input
                    ref={memoRef}
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder={type.flow === "memo" ? "무엇을 관찰했나요? (한 줄)" : "메모 (선택) — #태그 도 가능"}
                    maxLength={200}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (type.flow === "memo" || type.key === "custom")) {
                        e.preventDefault();
                        save({ recordType: type.key, detail: type.key === "custom" ? type.label : null, withMemo: true });
                      }
                    }}
                    className="rounded-lg border border-line bg-paper p-2.5 text-sm text-ink placeholder:text-ink-faint"
                  />

                  {/* 저장(세부 없이 / 메모만) */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      save({
                        recordType: type.key,
                        detail: type.key === "custom" ? type.label : null,
                        withMemo: true,
                      })
                    }
                    className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
                  >
                    {type.flow === "subject" || type.flow === "subs"
                      ? "세부 없이 저장"
                      : "저장"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
