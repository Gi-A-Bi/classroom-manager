"use client";

import { useState } from "react";
import { formatMonthDay } from "@/lib/dates";
import {
  deleteLessonPlan,
  moveLessonPlan,
  saveLessonPlan,
  toggleLessonDone,
} from "./actions";

type CellPlan = {
  id: string;
  subjectId: string | null;
  subjectName: string | null;
  unit: string;
  plan: string;
  note: string;
  done: boolean;
};
export type Cell = {
  date: string;
  period: number;
  timetableSubject: string | null;
  plan: CellPlan | null;
};
type Day = { date: string; label: string; isToday: boolean };
type Subject = { id: string; name: string };

export function WeekGrid({
  classroomId,
  week,
  days,
  periods,
  cells,
  subjects,
}: {
  classroomId: string;
  week: string;
  days: Day[];
  periods: number[];
  cells: Cell[][];
  subjects: Subject[];
}) {
  const [open, setOpen] = useState<{ p: number; d: number } | null>(null);

  const openCell = open ? cells[open.p]?.[open.d] : null;

  // 이 칸의 시간표 과목 + 그것이 이미 성적 과목 목록에 있는지
  const timetableName = openCell?.timetableSubject ?? null;
  const matchedSubjectId =
    timetableName != null
      ? (subjects.find((s) => s.name === timetableName)?.id ?? null)
      : null;
  // 시간표 과목이 목록에 없으면 "new:이름"으로 넣어 기본 선택(저장 시 자동 추가)
  const timetableOptionValue =
    timetableName && !matchedSubjectId ? `new:${timetableName}` : null;
  // 기본값: 저장된 계획의 과목 → 없으면 시간표 과목(있는 것/새로 추가할 것)
  const defaultSubjectId =
    openCell?.plan?.subjectId ??
    matchedSubjectId ??
    timetableOptionValue ??
    "";

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper p-2">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-10 border border-line bg-paper-soft p-2 text-xs text-ink-soft">
                교시
              </th>
              {days.map((day) => (
                <th
                  key={day.date}
                  className={`border border-line p-2 text-xs ${
                    day.isToday ? "bg-slate-100 text-slate-800" : "bg-paper-soft text-ink"
                  }`}
                >
                  <span className="font-bold">{day.label}</span>
                  <span className="ml-1 tabular-nums text-ink-faint">
                    {formatMonthDay(day.date)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period, pi) => (
              <tr key={period}>
                <th className="border border-line bg-paper-soft p-2 text-center font-bold tabular-nums text-ink-soft">
                  {period}
                </th>
                {days.map((day, di) => {
                  const cell = cells[pi][di];
                  const isOpen = open?.p === pi && open?.d === di;
                  const subjectText = cell.plan?.subjectName ?? cell.timetableSubject;
                  const hasPlan = cell.plan !== null;
                  const done = cell.plan?.done ?? false;
                  return (
                    <td
                      key={day.date}
                      className={`border border-line p-0 align-top ${
                        isOpen ? "ring-2 ring-inset ring-slate-400" : ""
                      }`}
                    >
                      <div className="relative h-full min-h-16">
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : { p: pi, d: di })}
                          className={`flex h-full min-h-16 w-full flex-col gap-0.5 p-1.5 text-left transition-colors ${
                            done
                              ? "bg-slate-50"
                              : hasPlan
                                ? "bg-paper hover:bg-paper-soft"
                                : "hover:bg-paper-soft"
                          }`}
                        >
                          {subjectText ? (
                            <span
                              className={`text-xs font-semibold ${
                                hasPlan ? "text-ink" : "text-ink-faint"
                              }`}
                            >
                              {subjectText}
                            </span>
                          ) : (
                            !hasPlan && (
                              <span className="text-xs text-ink-faint">＋</span>
                            )
                          )}
                          {cell.plan?.unit && (
                            <span className="break-words text-[11px] leading-tight text-ink-soft">
                              {cell.plan.unit}
                            </span>
                          )}
                          {cell.plan?.note && (
                            <span className="text-[11px] text-ink-faint">💬</span>
                          )}
                        </button>

                        {hasPlan && (
                          <form
                            action={toggleLessonDone}
                            className="absolute right-1 top-1"
                          >
                            <input type="hidden" name="classroom_id" value={classroomId} />
                            <input type="hidden" name="plan_id" value={cell.plan!.id} />
                            <input type="hidden" name="week" value={week} />
                            <button
                              type="submit"
                              title={done ? "완료 해제" : "계획대로 완료"}
                              className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                                done
                                  ? "border-slate-500 bg-slate-500 text-white"
                                  : "border-line-strong bg-paper text-transparent hover:border-slate-400 hover:text-slate-300"
                              }`}
                            >
                              ✓
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openCell && (
        <section
          key={`${openCell.date}-${openCell.period}`}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">
              {days[open!.d].label}요일 {formatMonthDay(openCell.date)} · {openCell.period}교시
            </h2>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-md px-2 py-1 text-sm text-ink-faint hover:bg-paper-soft"
            >
              닫기 ×
            </button>
          </div>

          <form action={saveLessonPlan} className="flex flex-col gap-3">
            <input type="hidden" name="classroom_id" value={classroomId} />
            <input type="hidden" name="plan_date" value={openCell.date} />
            <input type="hidden" name="period" value={openCell.period} />
            <input type="hidden" name="week" value={week} />

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                과목
                <select
                  name="subject_id"
                  defaultValue={defaultSubjectId}
                  className="rounded-lg border border-line bg-paper-soft p-2 text-ink"
                >
                  <option value="">- 과목 없음</option>
                  {timetableOptionValue && (
                    <option value={timetableOptionValue}>{timetableName}</option>
                  )}
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm text-ink-soft">
                단원 / 주제 <span className="text-xs text-ink-faint">(선택)</span>
                <input
                  type="text"
                  name="unit"
                  defaultValue={openCell.plan?.unit ?? ""}
                  placeholder="3단원. 분수의 덧셈"
                  className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              계획 내용
              <textarea
                name="plan"
                rows={3}
                defaultValue={openCell.plan?.plan ?? ""}
                placeholder="도입: 실생활 예시 → 전개: 분모가 같은 분수 더하기 → 정리: 형성평가"
                className="rounded-lg border border-line bg-paper-soft p-2 text-sm text-ink placeholder:text-ink-faint"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              실행 메모 <span className="text-xs text-ink-faint">(수업 후, 선택)</span>
              <textarea
                name="note"
                rows={2}
                defaultValue={openCell.plan?.note ?? ""}
                placeholder="진도 절반만 나감 · 다음 시간에 형성평가"
                className="rounded-lg border border-line bg-paper-soft p-2 text-sm text-ink placeholder:text-ink-faint"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="done"
                defaultChecked={openCell.plan?.done ?? false}
                className="h-4 w-4 accent-slate-600"
              />
              계획대로 완료
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                저장
              </button>
              {openCell.plan && (
                <button
                  type="submit"
                  formAction={deleteLessonPlan}
                  formNoValidate
                  name="plan_id"
                  value={openCell.plan.id}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
                >
                  칸 비우기
                </button>
              )}
            </div>
          </form>

          {openCell.plan && (
            <form
              action={moveLessonPlan}
              className="flex flex-wrap items-end gap-2 border-t border-line pt-3 text-sm"
            >
              <input type="hidden" name="classroom_id" value={classroomId} />
              <input type="hidden" name="plan_id" value={openCell.plan.id} />
              <input type="hidden" name="week" value={week} />
              <span className="text-ink-soft">다른 날로 미루기:</span>
              <input
                type="date"
                name="target_date"
                defaultValue={openCell.date}
                className="rounded-lg border border-line bg-paper-soft p-1.5 text-ink"
              />
              <select
                name="target_period"
                defaultValue={openCell.period}
                className="rounded-lg border border-line bg-paper-soft p-1.5 text-ink"
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {p}교시
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-line px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-soft"
              >
                이동
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
