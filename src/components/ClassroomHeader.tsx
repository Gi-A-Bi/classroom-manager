import { getTheme } from "@/lib/themes";

const TITLE_EMOJI: Record<string, string> = {
  알림장: "📝",
  "학생 명렬": "🧑‍🏫",
  시간표: "⏰",
  캘린더: "🗓️",
};

// 학급 페이지 공통 헤더 — 테마컬러를 상단 줄과 배경에 은은하게 적용
export function ClassroomHeader({
  name,
  title,
  classCode,
  themeColor,
}: {
  name: string;
  title: string;
  classCode?: string;
  themeColor?: string | null;
}) {
  const theme = getTheme(themeColor);

  return (
    <header className={`overflow-hidden rounded-xl ${theme.soft}`}>
      <div className={`h-1.5 ${theme.topbar}`} />
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <h1 className={`text-xl font-bold ${theme.text}`}>
          {TITLE_EMOJI[title] ?? ""} {name}{" "}
          <span className="font-medium">{title}</span>
        </h1>
        {classCode && (
          <span className="text-sm text-gray-600">
            학급코드{" "}
            <code className="rounded-md bg-white/80 px-2 py-1 font-mono font-bold">
              {classCode}
            </code>
          </span>
        )}
      </div>
    </header>
  );
}
