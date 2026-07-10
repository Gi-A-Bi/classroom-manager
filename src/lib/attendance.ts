// 출결 상태·사유 정의 (서버·클라이언트 공용)

export const ATTENDANCE_TYPES = {
  present: { label: "출석", short: "출", style: "bg-white text-gray-400 border-gray-200" },
  absent: { label: "결석", short: "결", style: "bg-red-100 text-red-700 border-red-200" },
  late: { label: "지각", short: "지", style: "bg-amber-100 text-amber-700 border-amber-200" },
  early: { label: "조퇴", short: "조", style: "bg-orange-100 text-orange-700 border-orange-200" },
  result: { label: "결과", short: "과", style: "bg-purple-100 text-purple-700 border-purple-200" },
} as const;

export type AttendanceType = keyof typeof ATTENDANCE_TYPES;

export const ATTENDANCE_REASONS: Record<Exclude<AttendanceType, "present">, string[]> = {
  absent: ["병결", "체험학습", "출석인정", "미인정", "기타"],
  late: ["질병", "인정", "미인정"],
  early: ["질병", "인정", "미인정"],
  result: ["질병", "인정", "미인정"],
};

export const EXCEPTION_TYPES: Exclude<AttendanceType, "present">[] = [
  "absent",
  "late",
  "early",
  "result",
];
