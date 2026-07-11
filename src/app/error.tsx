"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center gap-5 p-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-paper-soft text-5xl ring-1 ring-line">
        🌧️
      </span>
      <div>
        <h1 className="font-display text-3xl text-ink">문제가 생겼어요</h1>
        <p className="mt-2 font-hand text-xl text-ink-soft">
          잠시 후 다시 시도해 주세요
        </p>
      </div>
      <p className="text-sm text-ink-soft">
        화면을 새로고침하면 대부분 해결돼요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
      >
        다시 시도
      </button>
    </main>
  );
}
