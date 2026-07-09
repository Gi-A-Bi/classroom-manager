// 날짜 유틸 — 서버 로컬 시간(KST) 기준으로 동작한다.

export const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// YYYY-MM-DD (로컬 기준)
export function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayString() {
  return toDateString(new Date());
}

// 1=월 … 7=일 (timetable_slots.day_of_week와 같은 체계)
export function dayOfWeekMon1(d = new Date()) {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

export function formatKoreanDate(dateString: string) {
  const d = new Date(dateString + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[dayOfWeekMon1(d) - 1]})`;
}

// "YYYY-MM" 파싱 (잘못된 값이면 이번 달)
export function parseMonth(month?: string): { year: number; monthIndex: number } {
  const m = month?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    if (year >= 2000 && year <= 2100 && monthIndex >= 0 && monthIndex <= 11) {
      return { year, monthIndex };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export function monthString(year: number, monthIndex: number) {
  return `${year}-${pad(monthIndex + 1)}`;
}

export function addMonths(year: number, monthIndex: number, delta: number) {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

// 월간 캘린더 격자: 주(월요일 시작) 단위 2차원 배열.
// 해당 월 바깥 칸은 null.
export function monthGrid(year: number, monthIndex: number): (string | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = dayOfWeekMon1(first) - 1;

  const cells: (string | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateString(new Date(year, monthIndex, i + 1)),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
