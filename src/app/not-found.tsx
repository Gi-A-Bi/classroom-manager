import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center gap-5 p-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-paper-soft text-5xl ring-1 ring-line">
        🔍
      </span>
      <div>
        <p className="font-display text-6xl tabular-nums text-ink">404</p>
        <h1 className="mt-2 font-hand text-2xl text-ink-soft">
          페이지를 찾을 수 없어요
        </h1>
      </div>
      <p className="text-sm text-ink-soft">
        주소가 바뀌었거나, 볼 수 있는 권한이 없는 페이지예요.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
