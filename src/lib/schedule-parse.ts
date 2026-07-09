// 학사일정 붙여넣기 파서 — 한글/엑셀 표에서 복사한 텍스트에서
// 날짜(단일/기간)와 행사명을 인식한다. 서버·클라이언트 어디서든 동작(순수 함수).
//
// 지원 형식: "3/2", "3월 2일", "3.2.", "3. 2.(월)", 기간 "7/21~8/24", "7/21~24"
// 연도 추론: 학년도 기준 — 3~12월은 해당 연도, 1~2월은 이듬해.

export type ParsedRow = {
  title: string;
  start: string | null; // YYYY-MM-DD, null이면 인식 실패(수동 입력 대상)
  end: string | null;
  raw: string;
};

// "3/2" "3.2." "3월 2일" "3. 2.(월)" — 월·일 캡처
const DATE_RE =
  /(\d{1,2})\s*(?:[./월])\s*(\d{1,2})\s*(?:일)?\s*\.?\s*(?:\([월화수목금토일]\))?/g;

// 기간 구분자 뒤에 일만 오는 경우: "7/21~24"
const DAY_ONLY_RE = /^\s*(\d{1,2})\s*(?:일)?\s*\.?\s*(?:\([월화수목금토일]\))?/;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(academicYear: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = month <= 2 ? academicYear + 1 : academicYear;
  const d = new Date(year, month - 1, day);
  // 4/31처럼 실제로 없는 날짜 걸러내기
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseScheduleText(
  text: string,
  academicYear: number,
): ParsedRow[] {
  return text
    .split("\n")
    .map((line) => line.replace(/\t/g, " ").trim())
    .filter((line) => line.length > 0)
    .map((line) => parseLine(line, academicYear));
}

function parseLine(line: string, academicYear: number): ParsedRow {
  DATE_RE.lastIndex = 0;
  const matches = [...line.matchAll(DATE_RE)];

  if (matches.length === 0) {
    return { title: line, start: null, end: null, raw: line };
  }

  const first = matches[0];
  const start = toIso(academicYear, Number(first[1]), Number(first[2]));
  if (!start) {
    return { title: line, start: null, end: null, raw: line };
  }

  let end: string | null = null;
  let consumedUpTo = first.index! + first[0].length;

  // 기간: 첫 날짜 바로 뒤가 ~(또는 ∼)이면 종료일을 찾는다
  const afterFirst = line.slice(consumedUpTo);
  const rangeSep = afterFirst.match(/^\s*[~∼]\s*/);
  if (rangeSep) {
    const afterSep = afterFirst.slice(rangeSep[0].length);
    const second = matches.find((m) => m.index! >= consumedUpTo);
    if (second && line.slice(consumedUpTo, second.index!).match(/^\s*[~∼]\s*$/)) {
      // "7/21~8/24" — 완전한 두 번째 날짜
      end = toIso(academicYear, Number(second[1]), Number(second[2]));
      consumedUpTo = second.index! + second[0].length;
    } else {
      // "7/21~24" — 일만 있는 종료일 (월은 시작일과 동일)
      const dayOnly = afterSep.match(DAY_ONLY_RE);
      if (dayOnly) {
        end = toIso(academicYear, Number(first[1]), Number(dayOnly[1]));
        consumedUpTo += rangeSep[0].length + dayOnly[0].length;
      }
    }
    // 종료일이 시작일보다 앞이면(연도 넘어가는 기간 등) 단일 일정으로 처리
    if (end && end < start) end = null;
  }

  // 날짜 부분을 제외한 나머지가 행사명
  const title = (line.slice(0, first.index!) + " " + line.slice(consumedUpTo))
    .replace(/[~∼|·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { title, start, end, raw: line };
}
