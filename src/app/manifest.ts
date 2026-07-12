import type { MetadataRoute } from "next";

// PWA 대비 웹 앱 매니페스트 — Next가 /manifest.webmanifest로 제공하고
// <head>에 자동 연결한다. 정식 PWA(서비스워커·PNG 아이콘)는 파일럿 패키지 과제.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "학교수첩",
    short_name: "학교수첩",
    description: "우리 반의 하루가 한곳에 — 교사와 학생을 위한 학교수첩",
    start_url: "/",
    display: "standalone",
    background_color: "#f3ead9",
    theme_color: "#f3ead9",
    lang: "ko",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
