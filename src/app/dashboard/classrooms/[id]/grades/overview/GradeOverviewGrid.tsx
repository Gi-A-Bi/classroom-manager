"use client";

import { useState } from "react";
import { formatKoreanDate } from "@/lib/dates";

type Detail = { title: string; date: string; value: string; max: number | null };
type Cell = {
  subjectId: string;
  label: string;
  intensity: number | null;
  detail: Detail[];
};
type Row = {
  student: { id: string; number: number; nickname: string };
  cells: Cell[];
};

// intensity(0~1)를 인디고 배경 농도로. 미입력은 회색.
function cellStyle(intensity: number | null): string {
  if (intensity === null) return "bg-gray-50 text-gray-300";
  if (intensity >= 0.85) return "bg-indigo-600 text-white";
  if (intensity >= 0.7) return "bg-indigo-400 text-white";
  if (intensity >= 0.5) return "bg-indigo-200 text-indigo-900";
  if (intensity >= 0.3) return "bg-indigo-100 text-indigo-800";
  return "bg-indigo-50 text-indigo-700";
}

export function GradeOverviewGrid({
  subjects,
  grid,
}: {
  subjects: { id: string; name: string }[];
  grid: Row[];
}) {
  const [open, setOpen] = useState<{ studentId: string; subjectId: string } | null>(
    null,
  );

  const openRow = open
    ? grid.find((r) => r.student.id === open.studentId)
    : null;
  const openCell = openRow?.cells.find((c) => c.subjectId === open?.subjectId);
  const openSubject = subjects.find((s) => s.id === open?.subjectId);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border bg-white p-3 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border bg-gray-50 p-2 text-left">
                학생
              </th>
              {subjects.map((s) => (
                <th key={s.id} className="border bg-gray-50 p-2 text-center">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.student.id}>
                <th className="sticky left-0 z-10 whitespace-nowrap border bg-gray-50 p-2 text-left font-medium">
                  <span className="tabular-nums text-gray-400">
                    {row.student.number}
                  </span>{" "}
                  {row.student.nickname}
                </th>
                {row.cells.map((cell) => {
                  const isOpen =
                    open?.studentId === row.student.id &&
                    open?.subjectId === cell.subjectId;
                  return (
                    <td key={cell.subjectId} className="border p-0">
                      <button
                        type="button"
                        disabled={cell.detail.length === 0}
                        onClick={() =>
                          setOpen(
                            isOpen
                              ? null
                              : {
                                  studentId: row.student.id,
                                  subjectId: cell.subjectId,
                                },
                          )
                        }
                        className={`h-11 w-full text-center text-sm font-bold tabular-nums transition-transform ${cellStyle(
                          cell.intensity,
                        )} ${cell.detail.length > 0 ? "cursor-pointer hover:scale-105" : "cursor-default"} ${
                          isOpen ? "ring-2 ring-inset ring-gray-900" : ""
                        }`}
                      >
                        {cell.label || "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>성취도</span>
        <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">낮음</span>
        <span className="rounded bg-indigo-200 px-2 py-0.5 text-indigo-900">보통</span>
        <span className="rounded bg-indigo-600 px-2 py-0.5 text-white">높음</span>
        <span className="rounded bg-gray-50 px-2 py-0.5 text-gray-300">미입력</span>
      </div>

      {open && openRow && openCell && openSubject && (
        <section className="flex flex-col gap-2 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              {openRow.student.number}번 {openRow.student.nickname} ·{" "}
              {openSubject.name}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-gray-50"
            >
              닫기 ×
            </button>
          </div>
          {openCell.detail.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {openCell.detail.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-xl border bg-gray-50 p-2.5 text-sm"
                >
                  <span className="font-medium">{d.title}</span>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {formatKoreanDate(d.date)}
                  </span>
                  <span className="ml-auto rounded-lg bg-white px-2.5 py-1 font-bold">
                    {d.value}
                    {d.max !== null && (
                      <span className="font-normal text-gray-400">/{d.max}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">입력된 결과가 없어요.</p>
          )}
        </section>
      )}
    </div>
  );
}
