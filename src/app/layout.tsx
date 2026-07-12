import type { Metadata, Viewport } from "next";
import { Black_Han_Sans, Gaegu, Noto_Sans_KR } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

// 본문 — 가독성 우선 (그리드·데이터 화면까지 작은 크기로 잘 읽힘)
const notoKr = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-kr",
  display: "swap",
});

// 디스플레이 — 큰 페이지 제목의 주인공
const blackHan = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-black-han",
  display: "swap",
});

// 손글씨 — 빈 상태·스티커 같은 소량 강조에만
const gaegu = Gaegu({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-gaegu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "학교수첩",
  description: "우리 반의 하루가 한곳에 — 교사와 학생을 위한 학교수첩",
  applicationName: "학교수첩",
  manifest: "/manifest.webmanifest",
  // iOS 홈 화면에서 앱처럼(주소창 없이) 실행 + 상단 라벨
  appleWebApp: {
    capable: true,
    title: "학교수첩",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // 크림 배경과 맞춰 폰 상태바/주소창 색을 종이 톤으로
  themeColor: "#f3ead9",
  // 홈 화면 앱은 확대/축소로 레이아웃이 깨지지 않게 고정
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoKr.variable} ${blackHan.variable} ${gaegu.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ServiceWorker />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line py-4 text-center text-xs text-ink-faint">
          © 학교수첩 · 개발:{" "}
          <span className="font-semibold text-ink-soft">김민성</span> · 오류
          문의:{" "}
          <a
            href="mailto:healthydol@gmail.com"
            className="underline decoration-line-strong underline-offset-2 hover:text-ink-soft"
          >
            healthydol@gmail.com
          </a>
        </footer>
      </body>
    </html>
  );
}
