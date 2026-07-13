#!/usr/bin/env node
// ============================================================
// 클라우드 마이그레이션 자동 적용 (HTTPS / Supabase Management API)
//
// 왜 이 스크립트가 필요한가:
//   학교망이 Postgres 포트(5432/6543)를 막아 `supabase db push`가
//   클라우드 DB에 접속하지 못한다(“Failed to connect”). 반면 HTTPS(443)는
//   열려 있으므로, Management API의 SQL 실행 엔드포인트로 마이그레이션을 올린다.
//
// 준비(1회):
//   1) https://supabase.com/dashboard/account/tokens 에서 Personal Access Token 생성
//      (무료·카드 불필요).
//   2) .env.cloud 에 한 줄 추가:  SUPABASE_ACCESS_TOKEN=sbp_xxx...
//   3) 최초 1회 원장 동기화(기존 마이그레이션은 이미 클라우드에 적용돼 있으므로
//      실행하지 않고 “적용됨”으로만 표시):
//        node scripts/push-migrations-cloud.mjs --baseline
//
// 이후 매번(세션 마무리 루틴):
//   node scripts/push-migrations-cloud.mjs
//     → supabase/migrations 중 아직 클라우드에 없는 새 파일만 순서대로 실행.
//
// 옵션:
//   --baseline   : 미적용 파일 전부를 “실행 없이 적용됨으로 기록”(최초 1회)
//   --dry-run    : 무엇이 적용될지 출력만
// ============================================================

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG_DIR = join(ROOT, "supabase", "migrations");
const args = new Set(process.argv.slice(2));
const BASELINE = args.has("--baseline");
const DRY = args.has("--dry-run");

// --- env.cloud 로드 ---
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
const env = { ...loadEnv(".env.cloud"), ...process.env };

const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
const refMatch = url.match(/https?:\/\/([a-z0-9]+)\.supabase\./);
const REF = env.SUPABASE_PROJECT_REF || (refMatch && refMatch[1]);

function die(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

if (!REF) die("프로젝트 ref를 찾을 수 없습니다 (.env.cloud의 NEXT_PUBLIC_SUPABASE_URL 확인).");
if (!TOKEN)
  die(
    "SUPABASE_ACCESS_TOKEN 이 없습니다.\n" +
      "  https://supabase.com/dashboard/account/tokens 에서 토큰을 만들어\n" +
      "  .env.cloud 에 SUPABASE_ACCESS_TOKEN=sbp_... 로 추가하세요 (무료).",
  );

const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;

// Management API 로 SQL 실행
async function runSql(query) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text).message || text;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return text ? JSON.parse(text) : [];
}

async function main() {
  // 1) 원장 테이블 보장 (Supabase 표준 스키마 재사용)
  await runSql(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      name text,
      statements text[]
    );
  `);

  // 2) 로컬 마이그레이션 파일 목록
  const files = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const parse = (f) => {
    const m = f.match(/^(\d+)_(.*)\.sql$/);
    return { version: m ? m[1] : f.replace(/\.sql$/, ""), name: m ? m[2] : f, file: f };
  };
  const local = files.map(parse);

  // 3) 이미 적용된 버전
  const applied = await runSql(
    `select version from supabase_migrations.schema_migrations;`,
  );
  const appliedSet = new Set(applied.map((r) => r.version));

  const pending = local.filter((m) => !appliedSet.has(m.version));
  if (pending.length === 0) {
    console.log("✓ 클라우드가 최신 상태입니다. 적용할 마이그레이션이 없습니다.");
    return;
  }

  console.log(
    `대기 중인 마이그레이션 ${pending.length}개:\n` +
      pending.map((m) => "  · " + m.file).join("\n"),
  );

  if (DRY) {
    console.log("(--dry-run: 실제 적용하지 않음)");
    return;
  }

  const esc = (s) => "'" + s.replace(/'/g, "''") + "'";

  for (const m of pending) {
    if (BASELINE) {
      await runSql(
        `insert into supabase_migrations.schema_migrations (version, name)
         values (${esc(m.version)}, ${esc(m.name)})
         on conflict (version) do nothing;`,
      );
      console.log(`  ▷ 기록(실행 안 함): ${m.file}`);
      continue;
    }
    const sql = readFileSync(join(MIG_DIR, m.file), "utf8");
    process.stdout.write(`  ▶ 적용 중: ${m.file} ... `);
    try {
      await runSql(sql);
      await runSql(
        `insert into supabase_migrations.schema_migrations (version, name)
         values (${esc(m.version)}, ${esc(m.name)})
         on conflict (version) do nothing;`,
      );
      console.log("완료");
    } catch (e) {
      console.log("실패");
      die(
        `${m.file} 적용 실패:\n  ${e.message}\n` +
          "이 파일 이전까지는 적용/기록되었습니다. 원인 수정 후 다시 실행하세요.",
      );
    }
  }

  console.log(
    BASELINE
      ? `\n✓ 원장 동기화 완료 (${pending.length}개를 적용됨으로 표시). 이제부터 새 마이그레이션만 자동 적용됩니다.`
      : `\n✓ 클라우드에 ${pending.length}개 마이그레이션 적용 완료.`,
  );
}

main().catch((e) => die(e.message));
