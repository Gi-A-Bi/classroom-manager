// 오프라인 폴백 — 서비스워커가 네트워크 실패 시 보여준다. 정적(인증 무관).
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center gap-5 p-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-paper-soft text-5xl ring-1 ring-line">
        📶
      </span>
      <div>
        <h1 className="font-display text-3xl text-ink">인터넷이 끊겼어요</h1>
        <p className="mt-2 font-hand text-xl text-ink-soft">
          연결이 돌아오면 다시 보여요
        </p>
      </div>
      <p className="text-sm text-ink-soft">
        와이파이나 데이터를 켜고 새로고침해 주세요.
      </p>
    </main>
  );
}
