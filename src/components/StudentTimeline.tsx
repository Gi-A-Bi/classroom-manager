import Link from "next/link";
import { formatKoreanDate } from "@/lib/dates";

export type TimelineItem = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: "grade" | "attendance" | "record";
  chip: string; // tailwind 배지 색
  badge: string; // 성적 | 출결 | 기록
  title: string;
  value?: string; // 성적 값 등 우측 강조
  detail?: string | null; // 펼침 내용
  tags?: string[];
  recordType?: string;
  peerId?: string | null;
  peerName?: string | null;
  subject?: string;
};

// 다이어리 톤 타임라인 — 왼쪽 세로선 + 항목별 점, 시간순으로 적어 내려간 느낌.
// 펼침은 네이티브 <details>로 처리(클라이언트 JS 불필요).
export function StudentTimeline({
  items,
  peerHref,
  emptyLabel,
}: {
  items: TimelineItem[];
  peerHref: (studentId: string) => string;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center font-hand text-base text-ink-soft">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-3 border-l-2 border-line pl-5">
      {items.map((it) => {
        const hasMore =
          !!it.detail || (it.tags?.length ?? 0) > 0 || !!it.peerName;
        const dotColor =
          it.kind === "grade"
            ? "bg-sky-400"
            : it.kind === "attendance"
              ? "bg-amber-400"
              : "bg-ink/40";

        const head = (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-2 ring-cream ${dotColor}`}
              aria-hidden
            />
            <span className="font-hand text-sm text-ink-faint tabular-nums">
              {formatKoreanDate(it.date)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${it.chip}`}>
              {it.badge}
            </span>
            <span className="text-sm text-ink">{it.title}</span>
            {it.value && (
              <span className="ml-auto font-semibold text-ink tabular-nums">
                {it.value}
              </span>
            )}
          </div>
        );

        return (
          <li key={it.id} className="relative">
            {hasMore ? (
              <details className="group rounded-xl border border-line bg-paper px-3.5 py-2.5 [&_summary]:cursor-pointer">
                <summary className="list-none [&::-webkit-details-marker]:hidden">
                  {head}
                  <span className="mt-0.5 block text-xs text-ink-faint group-open:hidden">
                    자세히 보기 ▾
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
                  {it.detail && (
                    <p className="whitespace-pre-wrap text-sm text-ink">{it.detail}</p>
                  )}
                  {it.peerName && it.peerId && (
                    <p className="text-sm text-ink-soft">
                      상대:{" "}
                      <Link
                        href={peerHref(it.peerId)}
                        className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 transition-colors hover:bg-red-100"
                      >
                        {it.peerName} →
                      </Link>
                    </p>
                  )}
                  {it.tags && it.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {it.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-paper-soft px-2 py-0.5 text-xs text-ink-soft"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            ) : (
              <div className="rounded-xl border border-line bg-paper px-3.5 py-2.5">
                {head}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
