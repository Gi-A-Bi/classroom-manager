import { CalendarDays, House } from "lucide-react";
import { getTheme } from "@/lib/themes";
import { TabNav, type TabItem } from "./TabNav";

// 학생 화면 내비 — 학급 메뉴와 같은 다이어리 인덱스 스타일.
// 모바일 터치 기준 44px 이상 확보(minTouch).
export function StudentNav({
  current,
  themeColor,
}: {
  current: "home" | "calendar";
  themeColor?: string | null;
}) {
  const theme = getTheme(themeColor);
  const items: TabItem[] = [
    { href: "/student", label: "홈", icon: House, active: current === "home" },
    {
      href: "/student/calendar",
      label: "캘린더",
      icon: CalendarDays,
      active: current === "calendar",
    },
  ];
  return <TabNav items={items} underlineClass={theme.underline} minTouch />;
}
