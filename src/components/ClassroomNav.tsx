import {
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  Clock,
  GraduationCap,
  NotebookPen,
  NotebookText,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { getTheme } from "@/lib/themes";
import { TabNav, type TabItem } from "./TabNav";

// 학급 메뉴 — 사용 빈도 기준 순서(매일 → 수시 → 설정·가끔)
export const CLASSROOM_MENU = [
  { key: "posts", label: "알림장", icon: NotebookText },
  { key: "attendance", label: "출결", icon: CalendarCheck },
  { key: "timetable", label: "시간표", icon: Clock },
  { key: "calendar", label: "캘린더", icon: CalendarDays },
  { key: "grades", label: "성적", icon: GraduationCap },
  { key: "tools", label: "도구", icon: Wrench },
  { key: "students", label: "학생 명렬", icon: Users },
  { key: "records", label: "기록 카드", icon: NotebookPen },
] as const;

export function ClassroomNav({
  classroomId,
  current,
  themeColor,
}: {
  classroomId: string;
  current: (typeof CLASSROOM_MENU)[number]["key"];
  themeColor?: string | null;
}) {
  const theme = getTheme(themeColor);
  const items: TabItem[] = CLASSROOM_MENU.map((m) => ({
    href: `/dashboard/classrooms/${classroomId}/${m.key}`,
    label: m.label,
    icon: m.icon,
    active: m.key === current,
  }));

  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeft size={15} strokeWidth={2} aria-hidden />
        대시보드
      </Link>
      <TabNav items={items} underlineClass={theme.underline} />
    </div>
  );
}
