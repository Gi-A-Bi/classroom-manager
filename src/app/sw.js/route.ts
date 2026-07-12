// (업데이트 배너 검증용 배포 — no-op)
// 서비스워커를 "라우트"로 서빙한다. 배포마다 VERSION이 바뀌므로
// 브라우저가 sw.js의 변경을 감지 → 새 워커 설치 → (대기 상태) → 앱이 배너로 안내.
// public/sw.js(정적) 대신 이걸 쓴다. (정적 파일은 배포마다 내용이 같아 갱신 감지 불가)

// 한 배포 안에서는 고정, 배포가 바뀌면 달라지는 값
const VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  `dev-${Date.now()}`;

const SW = `// 학교수첩 서비스워커 (version: ${VERSION})
const VERSION = ${JSON.stringify(VERSION)};
const STATIC_CACHE = "static-" + VERSION;
const OFFLINE_URL = "/offline";
const PRECACHE = [
  OFFLINE_URL,
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
  // skipWaiting 하지 않음 — 새 워커는 "대기" 상태로 두고, 앱이 새로고침 배너를
  // 띄운 뒤 사용자가 눌렀을 때만 교체한다(작업 중 갑작스런 교체 방지).
});

// 앱이 "지금 교체" 신호를 보내면 대기 해제
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
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
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 네트워크 우선(항상 최신 HTML), 실패 시 오프라인 안내
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // 콘텐츠 해시 정적 자산·아이콘: 캐시 우선
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
});
`;

export const dynamic = "force-static";

export function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // sw.js는 항상 재검증되어야 갱신이 즉시 감지된다
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
