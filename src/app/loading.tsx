// 라우트 전환 중 즉시 표시되는 로딩 화면 — 클릭 반응이 없어 보이는 것 방지
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 p-6">
      <span
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-ink-soft"
      />
      <p className="font-hand text-lg text-ink-soft">넘어가는 중…</p>
    </main>
  );
}
