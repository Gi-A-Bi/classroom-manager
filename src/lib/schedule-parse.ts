// 학사일정 붙여넣기 파서 — 한글/엑셀/나이스 표에서 복사한 텍스트에서
// 날짜(단일/기간)와 행사명을 인식한다. 서버·클라이언트 어디서든 동작(순수 함수).
//
// 지원 형식 예:
//   3/2 · 3.2. · 3월 2일 · 3. 2.(월)              (짧은 날짜)
//   2026-03-02 · 2026.3.2 · 2026/3/2 · 2026.3.2.(월)  (연도 포함)
//   기간: 7/21~8/24 · 7/21~24 · 3/2 - 3/6 · 2026-03-02 ~ 2026-03-06
//   엑셀 표(탭 구분): "3/2\t입학식" · "입학식\t3/2" (열 순서 무관)
// 연도 추론: 연도가 없으면 학년도 기준 — 3~12월=해당 연도, 1~2월=이듬해.

export type ParsedRow = {
  title: string;
  start: string | null; // YYYY-MM-DD, null이면 인식 실패(수동 입력 대상)
  end: string | null;
  raw: string;
};

type DateToken = {
  index: number;
  length: number;
  iso: string;
  month: number;
  day: number;
};

// 연도 포함(2026-03-02, 2026.3.2 …) 또는 짧은 날짜(3/2, 3.2., 3월 2일 …)
// 그룹: 1=연 2=월 3=일 (연도형) | 4=월 5=일 (짧은형)
const DATE_TOKEN =
  /(?:(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})|(\d{1,2})\s*[./월]\s*(\d{1,2}))\s*(?:일)?\s*\.?\s*(?:\([월화수목금토일]\))?/g;

// 기간 뒤에 "일"만 오는 경우("7/21~24")
const DAY_ONLY_RE = /^\s*(\d{1,2})\s*(?:일)?\s*\.?\s*(?:\([월화수목금토일]\))?/;

// 날짜 사이의 기간 구분자: ~ ∼ - – — (앞뒤 공백 허용)
const RANGE_SEP_RE = /^\s*[~∼\-–—]\s*/;

const HEADER_WORDS = /날짜|일자|월일|요일|행사|내용|구분|비고|학사/;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function makeIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null; // 4/31 등 제거
  return `${year}-${pad(month)}-${pad(day)}`;
}

// 연도 결정: 명시된 연도가 있으면(2000~2100) 사용, 없으면 학년도로 추론
function resolveYear(explicit: number | null, month: number, academicYear: number) {
  if (explicit && explicit >= 2000 && explicit <= 2100) return explicit;
  return month <= 2 ? academicYear + 1 : academicYear;
}

function tokenAt(m: RegExpMatchArray, academicYear: number): DateToken | null {
  const isFull = m[1] !== undefined;
  const month = Number(isFull ? m[2] : m[4]);
  const day = Number(isFull ? m[3] : m[5]);
  const year = resolveYear(isFull ? Number(m[1]) : null, month, academicYear);
  const iso = makeIso(year, month, day);
  if (!iso) return null;
  return { index: m.index!, length: m[0].length, iso, month, day };
}

export function parseScheduleText(
  text: string,
  academicYear: number,
): ParsedRow[] {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\t/g, " ").trim())
    .filter((line) => line.length > 0);

  const parsed = lines.map((line) => parseLine(line, academicYear));

  // 첫 줄이 날짜 없는 머리글이면 버린다 (예: "날짜  행사명")
  if (
    parsed.length > 1 &&
    !parsed[0].start &&
    HEADER_WORDS.test(parsed[0].raw) &&
    !DATE_TOKEN.test(parsed[0].raw)
  ) {
    DATE_TOKEN.lastIndex = 0;
    return parsed.slice(1);
  }
  DATE_TOKEN.lastIndex = 0;
  return parsed;
}

function parseLine(line: string, academicYear: number): ParsedRow {
  DATE_TOKEN.lastIndex = 0;
  const raw = line;
  const rawMatches = [...line.matchAll(DATE_TOKEN)];
  const tokens = rawMatches
    .map((m) => tokenAt(m, academicYear))
    .filter((t): t is DateToken => t !== null);

  if (tokens.length === 0) {
    return { title: line, start: null, end: null, raw };
  }

  const startTok = tokens[0];
  const start = startTok.iso;
  let end: string | null = null;
  let consumedStart = startTok.index;
  let consumedEnd = startTok.index + startTok.length;

  // 기간 처리: 시작일 바로 뒤가 기간 구분자면 종료일을 찾는다
  const after = line.slice(consumedEnd);
  const sep = after.match(RANGE_SEP_RE);
  if (sep) {
    const secondTok = tokens.find((t) => t.index >= consumedEnd);
    const between = secondTok ? line.slice(consumedEnd, secondTok.index) : "";
    if (secondTok && RANGE_SEP_RE.test(between) && between.replace(RANGE_SEP_RE, "").trim() === "") {
      // 완전한 두 번째 날짜 ("7/21~8/24", "2026-03-02 ~ 2026-03-06")
      end = secondTok.iso;
      consumedEnd = secondTok.index + secondTok.length;
    } else {
      // 일만 있는 종료일 ("7/21~24") — 월은 시작일과 동일
      const dayOnly = after.slice(sep[0].length).match(DAY_ONLY_RE);
      if (dayOnly) {
        const cand = makeIso(
          Number(start.slice(0, 4)),
          startTok.month,
          Number(dayOnly[1]),
        );
        if (cand) {
          end = cand;
          consumedEnd += sep[0].length + dayOnly[0].length;
        }
      }
    }
    if (end && end < start) end = null; // 종료가 시작보다 앞이면 단일로
  }

  // 날짜 부분을 제외한 나머지가 행사명 (열 순서 무관: 앞·뒤 텍스트 합침)
  const title = (line.slice(0, consumedStart) + " " + line.slice(consumedEnd))
    .replace(/[~∼|·\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { title, start, end, raw };
}
