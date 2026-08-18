#!/usr/bin/env node
// ============================================================
// 교사 계정 비밀번호 재설정 (Supabase Admin API / HTTPS)
//
// 왜 이 스크립트가 필요한가:
//   비밀번호는 복구가 불가능하다(단방향 해시). 재설정만 가능한데,
//   재설정 메일 흐름이 아직 배포되지 않았거나 메일을 못 받는 상황에서는
//   계정 주인이 직접 새 비밀번호를 넣을 수단이 필요하다.
//   Postgres 포트가 막힌 학교망에서도 되도록 HTTPS(443) Admin API를 쓴다.
//
// 준비:
//   .env.cloud 또는 .env.local 에 아래 두 값이 있어야 한다.
//     NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//     SUPABASE_SERVICE_ROLE_KEY=...        ← 절대 커밋 금지
//
// 사용:
//   node scripts/reset-teacher-password.mjs happydol@sen.go.kr
//     → 새 비밀번호를 화면에 안 보이게 입력받아 적용한다.
//   node scripts/reset-teacher-password.mjs --list
//     → 가입된 계정 목록만 확인(오타로 다른 주소에 가입했는지 확인용).
// ============================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  let text;
  try {
    text = readFileSync(join(ROOT, file), "utf8");
  } catch {
    return {};
  }
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const arg = process.argv[2];

if (!arg || arg === "--help" || arg === "-h") {
  console.log("사용법: node scripts/reset-teacher-password.mjs <이메일>  |  --list");
  process.exit(arg ? 0 : 1);
}

const env = { ...loadEnv(".env.cloud"), ...loadEnv(".env.local"), ...process.env };
const URL_BASE = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !SERVICE_KEY) {
  console.error(
    "✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 찾지 못했습니다.\n" +
      "  .env.cloud 또는 .env.local 에 두 값이 있는지 확인해주세요.\n" +
      "  service_role 키는 Supabase Dashboard → Project Settings → API 에 있습니다.",
  );
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function api(path, init = {}) {
  const res = await fetch(`${URL_BASE}/auth/v1${path}`, { ...init, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${JSON.stringify(body)}`);
  }
  return body;
}

// Admin API는 이메일 필터 지원이 버전마다 달라서, 페이지를 돌며 직접 찾는다.
async function allUsers() {
  const users = [];
  for (let page = 1; page <= 20; page++) {
    const body = await api(`/admin/users?page=${page}&per_page=200`);
    const chunk = body?.users ?? [];
    users.push(...chunk);
    if (chunk.length < 200) break;
  }
  return users;
}

const KEY_ENTER = ["\r", "\n"];
const KEY_CTRL_C = "\u0003";
const KEY_CTRL_D = "\u0004";
const KEY_BACKSPACE = ["\u007f", "\b"];

// 비밀번호가 셸 히스토리나 화면에 남지 않도록 가려서 입력받는다.
function askHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error("대화형 터미널에서 실행해주세요(비밀번호를 가려서 입력받습니다)."));
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch) => {
      if (KEY_ENTER.includes(ch) || ch === KEY_CTRL_D) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (ch === KEY_CTRL_C) {
        stdin.setRawMode(false);
        stdout.write("\n");
        process.exit(130);
      } else if (KEY_BACKSPACE.includes(ch)) {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

const users = await allUsers();

if (arg === "--list") {
  console.log(`가입된 계정 ${users.length}개:`);
  for (const u of users) {
    console.log(
      `  ${u.email ?? "(이메일 없음)"}` +
        `${u.email_confirmed_at ? "" : "  ← 메일 확인 안 됨(로그인 차단됨)"}` +
        `  가입 ${String(u.created_at).slice(0, 10)}`,
    );
  }
  process.exit(0);
}

const email = arg.trim().toLowerCase();
const user = users.find((u) => (u.email ?? "").toLowerCase() === email);

if (!user) {
  console.error(`✗ ${arg} 로 가입된 계정이 없습니다.`);
  console.error("  가입된 주소 목록:");
  for (const u of users) console.error(`    ${u.email ?? "(이메일 없음)"}`);
  process.exit(1);
}

console.log(`계정 확인: ${user.email}`);
console.log(`  가입일: ${String(user.created_at).slice(0, 10)}`);
console.log(
  `  마지막 로그인: ${user.last_sign_in_at ? String(user.last_sign_in_at).slice(0, 10) : "기록 없음"}`,
);
if (!user.email_confirmed_at) {
  console.log(
    "  ⚠ 메일 확인이 안 된 계정입니다 — 이것만으로도 로그인이 막힙니다. 함께 확인 처리합니다.",
  );
}

const pw1 = await askHidden("새 비밀번호 (6자 이상): ");
if (pw1.length < 6) {
  console.error("✗ 비밀번호는 6자 이상이어야 합니다.");
  process.exit(1);
}
const pw2 = await askHidden("한 번 더 입력: ");
if (pw1 !== pw2) {
  console.error("✗ 두 번 입력한 비밀번호가 다릅니다.");
  process.exit(1);
}

await api(`/admin/users/${user.id}`, {
  method: "PUT",
  body: JSON.stringify({ password: pw1, email_confirm: true }),
});

console.log(`✓ ${user.email} 의 비밀번호를 변경했습니다. 이제 로그인해보세요.`);
