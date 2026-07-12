// 학교수첩 서비스워커 — 설치형 PWA + 안전한 최소 캐싱
// 원칙: 로그인 사용자마다 다른 HTML은 절대 캐시하지 않는다(다른 학생 데이터
// 유출·오래된 화면 방지). 페이지 이동은 네트워크 우선 + 오프라인 폴백,
// 콘텐츠 해시가 붙은 정적 자산(_next/static)과 아이콘만 캐시한다.
const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [
  OFFLINE_URL,
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // 쓰기 요청은 건드리지 않음

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 외부(Supabase 등)는 그대로 통과

  // 페이지 이동: 네트워크 우선, 실패 시에만 오프라인 안내 (인증 HTML은 캐시 안 함)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // 콘텐츠 해시가 붙은 정적 자산·아이콘: 캐시 우선(있으면 즉시, 없으면 받아서 저장)
  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
  }
  // 그 외(GET API 등)는 개입하지 않고 기본 네트워크 동작
});
