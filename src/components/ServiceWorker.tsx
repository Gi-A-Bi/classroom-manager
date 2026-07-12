"use client";

import { useEffect } from "react";

// 서비스워커 등록 — PWA 설치 가능 요건. 프로덕션에서만 등록해
// 개발 중 HMR·캐시 꼬임을 피한다.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 등록 실패해도 앱 동작에는 영향 없음 (설치형 기능만 비활성)
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
