// 자리바꾸기 — 좌석 배치 자료구조와 조건 만족 랜덤 배치 알고리즘.
// 순수 함수(서버·클라이언트 공용). 좌석 키는 "r{행}c{열}" (행 0 = 교탁 앞줄).

export type SeatKey = string;

export type SeatingConfig = {
  rows: number;
  cols: number;
  disabled: SeatKey[]; // 통로·사용 안 함
  fixed: Record<string, SeatKey>; // studentId -> 고정 좌석
  forbidden: [string, string][]; // 이 두 학생은 인접 금지
  front: string[]; // 앞줄 우선 배치 학생 (시력 등)
};

export type Seat = { number: number; nickname: string; id: string };
export type SeatingResult = {
  rows: number;
  cols: number;
  disabled: SeatKey[];
  seats: Record<SeatKey, Seat>; // 좌석 -> 학생
  generatedAt: string;
};

export function seatKey(r: number, c: number): SeatKey {
  return `r${r}c${c}`;
}

export function parseSeat(key: SeatKey): { r: number; c: number } {
  const m = key.match(/^r(\d+)c(\d+)$/);
  return m ? { r: Number(m[1]), c: Number(m[2]) } : { r: 0, c: 0 };
}

export function defaultConfig(rows = 4, cols = 5): SeatingConfig {
  return { rows, cols, disabled: [], fixed: {}, forbidden: [], front: [] };
}

// 사용 가능한 좌석 목록 (disabled 제외)
export function usableSeats(config: SeatingConfig): SeatKey[] {
  const out: SeatKey[] = [];
  const dis = new Set(config.disabled);
  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      const k = seatKey(r, c);
      if (!dis.has(k)) out.push(k);
    }
  }
  return out;
}

function areAdjacent(a: SeatKey, b: SeatKey): boolean {
  const pa = parseSeat(a);
  const pb = parseSeat(b);
  const dr = Math.abs(pa.r - pb.r);
  const dc = Math.abs(pa.c - pb.c);
  return dr + dc === 1; // 상하좌우 인접
}

export type Student = { id: string; number: number; nickname: string };

export type AssignOutcome =
  | { ok: true; result: SeatingResult }
  | { ok: false; error: string };

// 조건을 만족하는 랜덤 배치 생성. index로 셔플을 달리해 재실행마다 다른 결과.
export function generateSeating(
  students: Student[],
  config: SeatingConfig,
  attemptSeed: number,
): AssignOutcome {
  const seats = usableSeats(config);
  if (students.length > seats.length) {
    return { ok: false, error: `자리(${seats.length})가 학생 수(${students.length})보다 적어요.` };
  }

  const studentById = new Map(students.map((s) => [s.id, s]));
  const forbidden = config.forbidden.filter(
    ([a, b]) => studentById.has(a) && studentById.has(b),
  );
  const frontSet = new Set(config.front.filter((id) => studentById.has(id)));

  // 의사난수 (seed 기반) — 재실행마다 다른 배치, 서버에서 재현 불필요
  let state = (attemptSeed * 2654435761) >>> 0;
  const rand = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 고정 좌석 먼저 배치
  const assignment = new Map<SeatKey, string>(); // seat -> studentId
  const seatOf = new Map<string, SeatKey>(); // studentId -> seat
  const disabledSet = new Set(config.disabled);
  for (const [studentId, seat] of Object.entries(config.fixed)) {
    if (!studentById.has(studentId)) continue;
    if (disabledSet.has(seat)) {
      return { ok: false, error: "고정한 자리 중 '사용 안 함'으로 표시된 자리가 있어요." };
    }
    if (assignment.has(seat)) {
      return { ok: false, error: "두 학생을 같은 자리에 고정할 수 없어요." };
    }
    assignment.set(seat, studentId);
    seatOf.set(studentId, seat);
  }

  const forbiddenOf = new Map<string, Set<string>>();
  for (const [a, b] of forbidden) {
    if (!forbiddenOf.has(a)) forbiddenOf.set(a, new Set());
    if (!forbiddenOf.has(b)) forbiddenOf.set(b, new Set());
    forbiddenOf.get(a)!.add(b);
    forbiddenOf.get(b)!.add(a);
  }

  const canPlace = (studentId: string, seat: SeatKey): boolean => {
    const foes = forbiddenOf.get(studentId);
    if (!foes) return true;
    for (const [otherSeat, otherId] of assignment) {
      if (foes.has(otherId) && areAdjacent(seat, otherSeat)) return false;
    }
    return true;
  };

  // 배치할 학생: 앞줄 우선 학생 먼저 (앞줄부터 채움)
  const remaining = students.filter((s) => !seatOf.has(s.id));
  const frontFirst = [
    ...shuffle(remaining.filter((s) => frontSet.has(s.id))),
    ...shuffle(remaining.filter((s) => !frontSet.has(s.id))),
  ];

  // 좌석 순서: 앞줄(작은 r)부터. 같은 행은 랜덤. 앞줄 우선 학생이 앞자리를 받도록.
  const openSeats = seats.filter((s) => !assignment.has(s));
  const seatsByRow = new Map<number, SeatKey[]>();
  for (const s of openSeats) {
    const { r } = parseSeat(s);
    if (!seatsByRow.has(r)) seatsByRow.set(r, []);
    seatsByRow.get(r)!.push(s);
  }
  const orderedSeats: SeatKey[] = [];
  for (const r of [...seatsByRow.keys()].sort((a, b) => a - b)) {
    orderedSeats.push(...shuffle(seatsByRow.get(r)!));
  }

  // 백트래킹: 학생을 순서대로, 가능한 좌석에 배치
  const placeIndex = (i: number): boolean => {
    if (i >= frontFirst.length) return true;
    const student = frontFirst[i];
    for (const seat of orderedSeats) {
      if (assignment.has(seat)) continue;
      if (!canPlace(student.id, seat)) continue;
      assignment.set(seat, student.id);
      if (placeIndex(i + 1)) return true;
      assignment.delete(seat);
    }
    return false;
  };

  if (!placeIndex(0)) {
    return {
      ok: false,
      error: "조건을 모두 만족하는 배치를 찾지 못했어요. 금지 쌍·고정 자리를 줄여보세요.",
    };
  }

  const resultSeats: Record<SeatKey, Seat> = {};
  for (const [seat, studentId] of assignment) {
    const s = studentById.get(studentId)!;
    resultSeats[seat] = { id: s.id, number: s.number, nickname: s.nickname };
  }

  return {
    ok: true,
    result: {
      rows: config.rows,
      cols: config.cols,
      disabled: config.disabled,
      seats: resultSeats,
      generatedAt: new Date().toISOString(),
    },
  };
}
