// PWA 아이콘 생성 — src/app/icon.svg(수첩)를 기반으로 PNG를 굽는다.
// 실행: node scripts/gen-icons.mjs  (sharp 사용, Next가 이미 의존)
// 결과물은 소스로 커밋한다(재실행하면 동일 산출).
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const CREAM = "#f3ead9";

// 파비콘과 같은 수첩 그림. 배경은 꽉 채운 사각(둥근 모서리는 OS/브라우저가 처리).
// vb: viewBox 한 변, pad: 아이콘을 그릴 안전영역 여백 비율(maskable용)
function notebookSvg(vb = 64, pad = 0) {
  const s = vb;
  const m = s * pad; // 안쪽 여백
  const iw = s - m * 2; // 그림 영역
  const x = (v) => m + (v / 64) * iw;
  const y = (v) => m + (v / 64) * iw;
  const w = (v) => (v / 64) * iw;
  const sw = (v) => (v / 64) * iw; // stroke-width 스케일
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="${CREAM}"/>
  <rect x="${x(16)}" y="${y(10)}" width="${w(36)}" height="${w(44)}" rx="${w(6)}" fill="#fffdf7" stroke="#2f2a23" stroke-width="${sw(3.5)}"/>
  <circle cx="${x(16)}" cy="${y(20)}" r="${w(3.2)}" fill="${CREAM}" stroke="#2f2a23" stroke-width="${sw(2.5)}"/>
  <circle cx="${x(16)}" cy="${y(32)}" r="${w(3.2)}" fill="${CREAM}" stroke="#2f2a23" stroke-width="${sw(2.5)}"/>
  <circle cx="${x(16)}" cy="${y(44)}" r="${w(3.2)}" fill="${CREAM}" stroke="#2f2a23" stroke-width="${sw(2.5)}"/>
  <line x1="${x(26)}" y1="${y(24)}" x2="${x(44)}" y2="${y(24)}" stroke="#cebfa3" stroke-width="${sw(3)}" stroke-linecap="round"/>
  <line x1="${x(26)}" y1="${y(33)}" x2="${x(44)}" y2="${y(33)}" stroke="#cebfa3" stroke-width="${sw(3)}" stroke-linecap="round"/>
  <line x1="${x(26)}" y1="${y(42)}" x2="${x(37)}" y2="${y(42)}" stroke="#cebfa3" stroke-width="${sw(3)}" stroke-linecap="round"/>
</svg>`;
}

const targets = [
  { file: "public/icon-192.png", size: 192, pad: 0 },
  { file: "public/icon-512.png", size: 512, pad: 0 },
  // maskable: 안전영역(약 20% 여백) 확보 — 원형 마스크로 잘려도 그림이 살아있게
  { file: "public/icon-maskable-512.png", size: 512, pad: 0.16 },
  // iOS 홈 화면 아이콘 (Next가 src/app/apple-icon.png를 자동 링크)
  { file: "src/app/apple-icon.png", size: 180, pad: 0 },
];

for (const t of targets) {
  const svg = Buffer.from(notebookSvg(64, t.pad));
  const png = await sharp(svg, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toBuffer();
  writeFileSync(t.file, png);
  console.log(`✓ ${t.file} (${t.size}x${t.size}${t.pad ? ", maskable" : ""})`);
}

// 파비콘 SVG가 있는지 확인만 (icon.svg는 손으로 관리)
try {
  readFileSync("src/app/icon.svg");
  console.log("✓ src/app/icon.svg 유지");
} catch {
  console.log("! src/app/icon.svg 없음");
}
console.log("완료.");
