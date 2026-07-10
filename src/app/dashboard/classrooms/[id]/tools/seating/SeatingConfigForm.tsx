"use client";

import { useState } from "react";
import {
  defaultConfig,
  parseSeat,
  seatKey,
  type SeatingConfig,
} from "@/lib/tools/seating";
import { saveConfig } from "./actions";

type Student = { id: string; number: number; nickname: string };

export function SeatingConfigForm({
  classroomId,
  students,
  initial,
}: {
  classroomId: string;
  students: Student[];
  initial: SeatingConfig | null;
}) {
  const [config, setConfig] = useState<SeatingConfig>(
    initial ?? defaultConfig(),
  );

  const nameOf = (sid: string) => {
    const s = students.find((x) => x.id === sid);
    return s ? `${s.number} ${s.nickname}` : "?";
  };

  const disabledSet = new Set(config.disabled);
  const usableCount =
    config.rows * config.cols - config.disabled.length;

  const setSize = (rows: number, cols: number) => {
    // 격자 밖으로 나간 좌석 참조 정리
    const inRange = (k: string) => {
      const { r, c } = parseSeat(k);
      return r < rows && c < cols;
    };
    setConfig((p) => ({
      ...p,
      rows,
      cols,
      disabled: p.disabled.filter(inRange),
      fixed: Object.fromEntries(
        Object.entries(p.fixed).filter(([, seat]) => inRange(seat)),
      ),
    }));
  };

  const toggleDisabled = (key: string) => {
    setConfig((p) => {
      const dis = new Set(p.disabled);
      if (dis.has(key)) dis.delete(key);
      else dis.add(key);
      // 사용 안 함으로 바꾼 자리에 고정 학생이 있으면 해제
      const fixed = { ...p.fixed };
      for (const [sid, seat] of Object.entries(fixed)) {
        if (seat === key && dis.has(key)) delete fixed[sid];
      }
      return { ...p, disabled: [...dis], fixed };
    });
  };

  // 조건 편집 상태
  const [fixStudent, setFixStudent] = useState("");
  const [fixSeat, setFixSeat] = useState("");
  const [foeA, setFoeA] = useState("");
  const [foeB, setFoeB] = useState("");

  const addFixed = () => {
    if (!fixStudent || !fixSeat) return;
    setConfig((p) => ({ ...p, fixed: { ...p.fixed, [fixStudent]: fixSeat } }));
    setFixStudent("");
    setFixSeat("");
  };
  const removeFixed = (sid: string) =>
    setConfig((p) => {
      const fixed = { ...p.fixed };
      delete fixed[sid];
      return { ...p, fixed };
    });

  const addForbidden = () => {
    if (!foeA || !foeB || foeA === foeB) return;
    const exists = config.forbidden.some(
      ([a, b]) =>
        (a === foeA && b === foeB) || (a === foeB && b === foeA),
    );
    if (!exists) {
      setConfig((p) => ({ ...p, forbidden: [...p.forbidden, [foeA, foeB]] }));
    }
    setFoeA("");
    setFoeB("");
  };
  const removeForbidden = (i: number) =>
    setConfig((p) => ({
      ...p,
      forbidden: p.forbidden.filter((_, j) => j !== i),
    }));

  const toggleFront = (sid: string) =>
    setConfig((p) => ({
      ...p,
      front: p.front.includes(sid)
        ? p.front.filter((x) => x !== sid)
        : [...p.front, sid],
    }));

  const seatLabel = (key: string) => {
    const { r, c } = parseSeat(key);
    return `${r + 1}행 ${c + 1}열`;
  };
  const openSeatOptions = usableSeatKeys(config);

  return (
    <div className="flex flex-col gap-4">
      {/* 격자 크기 */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          행
          <input
            type="number"
            min={1}
            max={10}
            value={config.rows}
            onChange={(e) => setSize(Number(e.target.value) || 1, config.cols)}
            className="w-16 rounded-lg border p-1.5"
          />
        </label>
        <label className="flex items-center gap-1">
          열
          <input
            type="number"
            min={1}
            max={10}
            value={config.cols}
            onChange={(e) => setSize(config.rows, Number(e.target.value) || 1)}
            className="w-16 rounded-lg border p-1.5"
          />
        </label>
        <span className="text-gray-500">
          사용 자리 {usableCount} / 학생 {students.length}명
        </span>
      </div>

      {/* 격자: 클릭으로 사용 안 함 토글 */}
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-lg bg-gray-800 px-6 py-1 text-xs font-medium text-white">
          교탁 (앞)
        </div>
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: config.rows }, (_, r) => (
            <div key={r} className="flex justify-center gap-1.5">
              {Array.from({ length: config.cols }, (_, c) => {
                const key = seatKey(r, c);
                const off = disabledSet.has(key);
                const fixedSid = Object.entries(config.fixed).find(
                  ([, seat]) => seat === key,
                )?.[0];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDisabled(key)}
                    title={`${seatLabel(key)} — 클릭하면 사용 안 함/사용 전환`}
                    className={`h-11 w-14 rounded-lg border text-xs transition-colors ${
                      off
                        ? "border-dashed bg-gray-100 text-gray-300"
                        : fixedSid
                          ? "border-amber-300 bg-amber-50 font-medium text-amber-800"
                          : "bg-white hover:bg-teal-50"
                    }`}
                  >
                    {off ? "✕" : fixedSid ? nameOf(fixedSid) : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          자리를 클릭하면 통로·사용 안 함으로 바꿀 수 있어요 (✕). 노란 자리는 고정석.
        </p>
      </div>

      {/* 조건: 고정석 */}
      <div className="flex flex-col gap-2 rounded-xl border bg-gray-50 p-3">
        <h3 className="text-sm font-semibold">📌 자리 고정</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={fixStudent}
            onChange={(e) => setFixStudent(e.target.value)}
            className="rounded-lg border p-1.5"
          >
            <option value="">학생</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.number} {s.nickname}
              </option>
            ))}
          </select>
          <select
            value={fixSeat}
            onChange={(e) => setFixSeat(e.target.value)}
            className="rounded-lg border p-1.5"
          >
            <option value="">자리</option>
            {openSeatOptions.map((k) => (
              <option key={k} value={k}>
                {seatLabel(k)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addFixed}
            className="rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50"
          >
            추가
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(config.fixed).map(([sid, seat]) => (
            <span
              key={sid}
              className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800"
            >
              {nameOf(sid)} → {seatLabel(seat)}
              <button type="button" onClick={() => removeFixed(sid)} className="font-bold">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 조건: 금지 쌍 */}
      <div className="flex flex-col gap-2 rounded-xl border bg-gray-50 p-3">
        <h3 className="text-sm font-semibold">🚫 이 두 명은 짝/옆자리 금지</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={foeA} onChange={(e) => setFoeA(e.target.value)} className="rounded-lg border p-1.5">
            <option value="">학생 1</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.number} {s.nickname}
              </option>
            ))}
          </select>
          <select value={foeB} onChange={(e) => setFoeB(e.target.value)} className="rounded-lg border p-1.5">
            <option value="">학생 2</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.number} {s.nickname}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addForbidden}
            className="rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50"
          >
            추가
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {config.forbidden.map(([a, b], i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-700"
            >
              {nameOf(a)} ✕ {nameOf(b)}
              <button type="button" onClick={() => removeForbidden(i)} className="font-bold">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 조건: 앞자리 우선 */}
      <div className="flex flex-col gap-2 rounded-xl border bg-gray-50 p-3">
        <h3 className="text-sm font-semibold">👀 앞자리 우선 (시력 등)</h3>
        <div className="flex flex-wrap gap-1.5">
          {students.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleFront(s.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                config.front.includes(s.id)
                  ? "bg-blue-600 text-white"
                  : "border bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {s.number} {s.nickname}
            </button>
          ))}
        </div>
      </div>

      <form action={saveConfig}>
        <input type="hidden" name="classroom_id" value={classroomId} />
        <input type="hidden" name="config" value={JSON.stringify(config)} />
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          설정 저장
        </button>
      </form>
    </div>
  );
}

function usableSeatKeys(config: SeatingConfig): string[] {
  const dis = new Set(config.disabled);
  const out: string[] = [];
  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      const k = seatKey(r, c);
      if (!dis.has(k)) out.push(k);
    }
  }
  return out;
}
