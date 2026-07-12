"use client";

import { useEffect, useState } from "react";

// 서비스워커 등록 + "새 버전 나왔어요" 배너.
// 새 배포가 나오면 브라우저가 새 sw.js를 설치(대기 상태)한다. 그걸 감지해
// 배너를 띄우고, 누르면 대기 워커를 즉시 교체 → 페이지 새로고침.
export function PwaUpdater() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let reg: ServiceWorkerRegistration | null = null;

    const promptFor = (sw: ServiceWorker | null) => {
      // controller가 있어야 "업데이트"(첫 설치가 아님)
      if (sw && navigator.serviceWorker.controller) setWaiting(sw);
    };

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((r) => {
          reg = r;
          if (r.waiting) promptFor(r.waiting);
          r.addEventListener("updatefound", () => {
            const nw = r.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed") promptFor(nw);
            });
          });
        })
        .catch(() => {});
    };

    // 등록
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    // 앱을 다시 열거나 탭이 보일 때 업데이트 확인
    const checkUpdate = () => reg?.update().catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === "visible") checkUpdate();
    };
    window.addEventListener("focus", checkUpdate);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("focus", checkUpdate);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!waiting) return null;

  const applyUpdate = () => {
    waiting.postMessage({ type: "SKIP_WAITING" });
    // 교체가 끝나면 controllerchange가 새로고침을 트리거한다
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 print:hidden">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-paper p-3 shadow-[0_6px_24px_rgba(47,42,35,0.16)]">
        <span aria-hidden className="text-2xl">
          ✨
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">새 버전이 나왔어요</p>
          <p className="text-xs text-ink-soft">
            새로고침하면 최신 화면으로 바뀌어요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWaiting(null)}
          className="shrink-0 rounded-lg px-2.5 py-2 text-xs text-ink-faint transition-colors hover:bg-paper-soft"
        >
          나중에
        </button>
        <button
          type="button"
          onClick={applyUpdate}
          className="shrink-0 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
        >
          새로고침
        </button>
      </div>
    </div>
  );
}
