import Link from "next/link";
import type { ReactNode } from "react";
import { getTheme, type ThemeKey } from "@/lib/themes";
import { cardClass, sectionLabelClass } from "./styles";

export { btn, inputClass, cardClass, sectionLabelClass } from "./styles";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// 종이 카드 — 얇은 테두리, 그림자 없음
export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "li";
}) {
  return <Tag className={cx(cardClass, "p-5", className)}>{children}</Tag>;
}

// 페이지 제목 — 디스플레이 폰트, 화면의 주인공
export function PageTitle({
  children,
  sub,
  className,
}: {
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <h1 className="font-display text-4xl leading-none tracking-tight text-ink">
        {children}
      </h1>
      {sub && <p className="text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

// 섹션 소제목 라벨
export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className={sectionLabelClass}>{children}</h2>;
}

// 파스텔 알약 태그 — 학급 테마색 또는 톤 지정
export function Tag({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: ThemeKey;
  className?: string;
}) {
  const t = getTheme(tone);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        t.soft,
        t.text,
        className,
      )}
    >
      {children}
    </span>
  );
}

// 알약 탭 (링크) — 현재 탭은 잉크 채움
export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-ink text-paper"
          : "border border-line bg-paper text-ink-soft hover:bg-paper-soft",
      )}
    >
      {children}
    </Link>
  );
}

// 빈 상태 — 손글씨 느낌 + 스티커 이모지 (소량 장식 허용 지점)
export function EmptyState({
  emoji = "🌿",
  children,
}: {
  emoji?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-paper/60 p-8 text-center">
      <span className="text-3xl">{emoji}</span>
      <p className="font-hand text-lg text-ink-soft">{children}</p>
    </div>
  );
}
