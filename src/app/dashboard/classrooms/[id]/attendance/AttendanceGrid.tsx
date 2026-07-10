"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ATTENDANCE_REASONS,
  ATTENDANCE_TYPES,
  EXCEPTION_TYPES,
  type AttendanceType,
} from "@/lib/attendance";
import { setAttendance } from "./actions";

type Student = { id: string; number: number; nickname: string };
type AttRecord = { type: AttendanceType; reason: string; memo: string };

// 오늘(또는 선택 날짜) 명렬. 기본 전원 출석, 예외 학생만 눌러 상태 지정.
export function AttendanceGrid({
  classroomId,
  date,
  students,
  initialRecords,
}: {
  classroomId: string;
  date: string;
  students: Student[];
  initialRecords: Record<string, AttRecord>;
}) {
  const router = useRouter();
  const [records, setRecords] = useState<Record<string, AttRecord>>(initialRecords);
  const [editing, setEditing] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const save = (
    studentId: string,
    type: AttendanceType,
    reason?: string,
    memo?: string,
  ) => {
    // 낙관적 업데이트
    setRecords((prev) => {
      const next: Record<string, AttRecord> = { ...prev };
      if (type === "present") delete next[studentId];
      else next[studentId] = { type, reason: reason ?? ATTENDANCE_REASONS[type][0], memo: memo ?? "" };
      return next;
    });
    startTransition(async () => {
      await setAttendance({ classroomId, studentId, date, type, reason, memo });
      router.refresh();
    });
  };

  const exceptionCount = Object.keys(records).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
          출석 {students.length - exceptionCount}
        </span>
        {EXCEPTION_TYPES.map((t) => {
          const count = Object.values(records).filter((r) => r.type === t).length;
          if (count === 0) return null;
          return (
            <span
              key={t}
              className={`rounded-full border px-3 py-1 font-medium ${ATTENDANCE_TYPES[t].style}`}
            >
              {ATTENDANCE_TYPES[t].label} {count}
            </span>
          );
        })}
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {students.map((s) => {
          const rec = records[s.id];
          const type = rec?.type ?? "present";
          const info = ATTENDANCE_TYPES[type];
          const isEditing = editing === s.id;
          return (
            <li
              key={s.id}
              className={`rounded-xl border border-line bg-paper p-2.5 ${isEditing ? "ring-2 ring-line-strong" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 truncate text-sm text-ink">
                  <span className="font-bold tabular-nums text-ink-faint">
                    {s.number}
                  </span>{" "}
                  {s.nickname}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(isEditing ? null : s.id)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-left text-sm font-medium transition-colors ${info.style}`}
                >
                  {info.label}
                  {rec && rec.reason && (
                    <span className="font-normal"> · {rec.reason}</span>
                  )}
                  {rec?.memo && <span className="text-xs"> 💬</span>}
                </button>
                {type !== "present" && (
                  <button
                    type="button"
                    onClick={() => {
                      save(s.id, "present");
                      setEditing(null);
                    }}
                    title="출석으로 되돌리기"
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-ink-faint hover:bg-paper-soft"
                  >
                    ↺
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        save(s.id, "present");
                        setEditing(null);
                      }}
                      className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-paper-soft"
                    >
                      출석
                    </button>
                    {EXCEPTION_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => save(s.id, t, ATTENDANCE_REASONS[t][0], rec?.memo)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          type === t ? ATTENDANCE_TYPES[t].style : "border-line text-ink-soft hover:bg-paper-soft"
                        }`}
                      >
                        {ATTENDANCE_TYPES[t].label}
                      </button>
                    ))}
                  </div>
                  {type !== "present" && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-ink-faint">사유:</span>
                      {ATTENDANCE_REASONS[type].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => save(s.id, type, r, rec?.memo)}
                          className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                            rec?.reason === r
                              ? "bg-ink text-paper"
                              : "border border-line text-ink-soft hover:bg-paper-soft"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                  {type !== "present" && (
                    <input
                      type="text"
                      defaultValue={rec?.memo ?? ""}
                      placeholder="메모 (선택)"
                      onBlur={(e) => {
                        if ((e.target.value ?? "") !== (rec?.memo ?? "")) {
                          save(s.id, type, rec?.reason, e.target.value);
                        }
                      }}
                      className="rounded-lg border border-line bg-paper-soft p-1.5 text-sm text-ink placeholder:text-ink-faint"
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
