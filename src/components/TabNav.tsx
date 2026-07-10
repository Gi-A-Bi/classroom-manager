import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// 다이어리 인덱스 탭 — 배경 없이 텍스트+가는 선 아이콘.
// 선택 탭만 두꺼운 밑줄(3px)과 진한 글자, 나머지는 중간톤.
// 폭 넘치면 가로 스크롤(스크롤바 숨김 + 끝 페이드), 아래 얇은 구분선으로 본문과 분리.

export type TabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

export function TabNav({
  items,
  underlineClass = "border-ink",
  minTouch = false,
}: {
  items: TabItem[];
  underlineClass?: string; // 선택 탭 밑줄 색 (테마/중립)
  minTouch?: boolean; // 학생 모바일: 44px 이상 확보
}) {
  return (
    <div className="relative border-b border-line bg-cream">
      {/* 끝 페이드 (좌우) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-cream to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-cream to-transparent" />

      <nav className="flex gap-5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`group flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-1 text-base transition-colors ${
                minTouch ? "min-h-[44px] py-2.5" : "py-3"
              } ${
                item.active
                  ? `${underlineClass} font-semibold text-ink`
                  : "border-transparent font-medium text-ink-soft hover:border-line-strong hover:text-ink"
              }`}
            >
              <Icon
                className={item.active ? "text-ink" : "text-ink-faint group-hover:text-ink-soft"}
                size={18}
                strokeWidth={1.75}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
