import { getTheme } from "@/lib/themes";

// 학급 서브 페이지 공통 헤더 — 종이 톤. 섹션 제목을 디스플레이로, 테마색 액센트 바.
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
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className={`h-9 w-1.5 shrink-0 rounded-full ${theme.topbar}`}
          aria-hidden
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-ink-faint">{name}</span>
          <h1 className="font-display text-3xl leading-none text-ink">{title}</h1>
        </div>
      </div>
      {classCode && (
        <span className="text-sm text-ink-soft">
          학급코드{" "}
          <code className="rounded-md border border-line bg-paper px-2 py-1 font-mono font-bold tracking-wider text-ink">
            {classCode}
          </code>
        </span>
      )}
    </header>
  );
}
