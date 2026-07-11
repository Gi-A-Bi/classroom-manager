import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Link2,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import { ModeSwitch } from "./ModeSwitch";
import { TabNav, type TabItem } from "./TabNav";

const WORK_MENU = [
  { key: "", label: "대시보드", icon: LayoutDashboard },
  { key: "lessons", label: "수업", icon: BookOpen },
  { key: "todos", label: "할 일", icon: ListChecks },
  { key: "documents", label: "공문", icon: FileText },
  { key: "calendar", label: "캘린더", icon: CalendarDays },
  { key: "notes", label: "노트", icon: NotebookPen },
  { key: "snippets", label: "스니펫", icon: ClipboardList },
  { key: "links", label: "링크", icon: Link2 },
] as const;

export function WorkNav({
  current,
}: {
  current: (typeof WORK_MENU)[number]["key"];
}) {
  const items: TabItem[] = WORK_MENU.map((m) => ({
    href: `/work${m.key ? `/${m.key}` : ""}`,
    label: m.label,
    icon: m.icon,
    active: m.key === current,
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModeSwitch current="work" />
      </div>
      {/* 업무 모드: 밑줄을 중립 남색으로 해 학급 모드와 구분 */}
      <TabNav items={items} underlineClass="border-slate-600" />
    </div>
  );
}
