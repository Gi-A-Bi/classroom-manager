import type { MetadataRoute } from "next";

// PWA 웹 앱 매니페스트 — Next가 /manifest.webmanifest로 제공하고 <head>에 자동 연결.
// 아이콘 PNG는 scripts/gen-icons.mjs로 icon.svg에서 생성한다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "학교수첩",
    short_name: "학교수첩",
    description: "우리 반의 하루가 한곳에 — 교사와 학생을 위한 학교수첩",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3ead9",
    theme_color: "#f3ead9",
    lang: "ko",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
