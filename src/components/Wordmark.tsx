// 서비스 워드마크 "학교수첩" — 이미지 로고 대신 디스플레이 폰트 로고타입.
// size: sm(헤더 라벨) / md(보조 화면) / lg(랜딩·인증 화면 주인공)
const SIZE = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-3xl",
} as const;

export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      className={`font-display tracking-tight text-ink ${SIZE[size]} ${className}`}
    >
      학교수첩
    </span>
  );
}
