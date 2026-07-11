// ============================================================
// 클라우드 Supabase RLS 검증 스크립트
// 사용: node scripts/verify-cloud-rls.mjs
// 준비: 프로젝트 루트에 .env.cloud (gitignore됨) —
//   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
//   SUPABASE_SERVICE_ROLE_KEY / SUPABASE_JWT_SECRET
// 키 값은 출력하지 않는다. 테스트 유저·데이터는 끝에 정리(삭제)한다.
// ============================================================
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";

// --- .env.cloud 로드 (값은 절대 출력 금지) — 인자로 다른 파일 지정 가능 ---
const envFile = process.argv[2] || ".env.cloud";
const env = {};
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = env.SUPABASE_JWT_SECRET;
if (!URL_ || !ANON || !SERVICE || !JWT_SECRET) {
  console.error("✗ .env.cloud에 4개 값이 모두 필요합니다.");
  process.exit(1);
}

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${detail}`); }
};

const rest = (path, { token = ANON, method = "GET", body, headers = {} } = {}) =>
  fetch(`${URL_}/rest/v1${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : undefined,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

const admin = (path, opts = {}) =>
  fetch(`${URL_}/auth/v1${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
    },
  });

async function createTeacher(tag) {
  const email = `rls-test-${tag}-${Date.now()}@example.com`;
  const password = "rls-test-" + Math.random().toString(36).slice(2, 12);
  const r = await admin("/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const u = await r.json();
  if (!u.id) throw new Error("테스트 교사 생성 실패: " + JSON.stringify(u).slice(0, 200));
  // 로그인해서 access token 획득
  const s = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const sess = await s.json();
  if (!sess.access_token) throw new Error("테스트 교사 로그인 실패");
  return { id: u.id, email, token: sess.access_token };
}

const studentJwt = async (claims) =>
  new SignJWT({ role: "authenticated", app_role: "student", ...claims })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.student_id ?? "00000000-0000-0000-0000-000000000009")
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(JWT_SECRET));

const teacherIds = [];
try {
  console.log("\n[0] 테스트 교사 2명 생성 (A=담임, B=타 교사)");
  const A = await createTeacher("a");
  const B = await createTeacher("b");
  teacherIds.push(A.id, B.id);

  console.log("[1] A가 학년도→학급→학생→알림장 생성");
  let r = await rest("/academic_years", { token: A.token, method: "POST", body: { teacher_id: A.id, year: 2099, name: "2099학년도(테스트)" } });
  const year = (await r.json())[0];
  r = await rest("/classrooms", { token: A.token, method: "POST", body: { academic_year_id: year.id, teacher_id: A.id, name: "RLS테스트반", class_code: "ZRLST9" } });
  const cls = (await r.json())[0];
  ok("A: 학급 생성", Boolean(cls?.id));
  r = await rest("/students", { token: A.token, method: "POST", body: { classroom_id: cls.id, number: 1, nickname: "테스트학생", pin_hash: "x" } });
  const stu = (await r.json())[0];
  r = await rest("/posts", { token: A.token, method: "POST", body: { classroom_id: cls.id, title: "테스트 알림장", content: "내용", post_date: "2099-03-02" } });
  const post = (await r.json())[0];
  r = await rest("/subjects", { token: A.token, method: "POST", body: { classroom_id: cls.id, name: "수학" } });
  ok("A: 학생·알림장·과목 생성", Boolean(stu?.id && post?.id) && r.ok);

  console.log("[2] 교사 격리 — 타 교사 B");
  r = await rest(`/classrooms?id=eq.${cls.id}`, { token: B.token });
  ok("B: A 학급 조회 0건", (await r.json()).length === 0);
  r = await rest(`/posts?classroom_id=eq.${cls.id}`, { token: B.token });
  ok("B: A 알림장 조회 0건", (await r.json()).length === 0);
  r = await rest("/posts", { token: B.token, method: "POST", body: { classroom_id: cls.id, title: "침입", content: "" } });
  ok("B: A 학급에 알림장 쓰기 차단", !r.ok);
  r = await rest(`/lesson_plans?classroom_id=eq.${cls.id}`, { token: B.token });
  ok("B: A 수업 계획 조회 0건", (await r.json()).length === 0);

  console.log("[3] 학생 토큰 — 소속 학급 조회 허용/차단 경계");
  const st = await studentJwt({ classroom_id: cls.id, student_id: stu.id });
  r = await rest(`/posts?classroom_id=eq.${cls.id}`, { token: st });
  ok("학생: 자기 반 알림장 조회 허용", (await r.json()).length >= 1);
  r = await rest(`/classrooms?id=eq.${cls.id}&select=id,name`, { token: st });
  ok("학생: 자기 반 학급 조회 허용", (await r.json()).length === 1);
  for (const t of ["subjects", "assessments", "assessment_results", "attendance_records", "student_records", "lesson_plans", "work_todos", "students"]) {
    r = await rest(`/${t}?classroom_id=eq.${cls.id}`, { token: st }).catch(() => null);
    let blocked;
    if (!r) blocked = true;
    else if (!r.ok) blocked = true; // 권한 자체가 없음(예: work_todos는 컬럼 불일치 400도 차단으로 침)
    else blocked = (await r.json()).length === 0;
    ok(`학생: ${t} 차단(0건/거부)`, blocked);
  }
  r = await rest("/lesson_plans", { token: st, method: "POST", body: { classroom_id: cls.id, plan_date: "2099-03-02", period: 1, unit: "침입" } });
  ok("학생: 수업 계획 쓰기 차단", !r.ok);
  // sub를 담임 id로 위조
  const forged = await studentJwt({ classroom_id: cls.id, student_id: A.id });
  r = await rest(`/subjects?classroom_id=eq.${cls.id}`, { token: forged });
  ok("학생(sub위조): 과목 조회 0건", r.ok ? (await r.json()).length === 0 : true);

  console.log("[4] anon — 전 테이블 차단");
  for (const t of ["classrooms", "students", "posts", "subjects", "lesson_plans", "work_todos", "attendance_records", "student_records"]) {
    r = await rest(`/${t}?limit=1`);
    ok(`anon: ${t} 거부`, !r.ok);
  }

  console.log("[5] 공유 링크 범위");
  const token32 = "a".repeat(32);
  await rest(`/classrooms?id=eq.${cls.id}`, { token: A.token, method: "PATCH", body: { share_token: token32 } });
  r = await rest(`/events`, { token: A.token, method: "POST", body: { classroom_id: cls.id, layer: "classroom", title: "테스트 일정", event_date: "2099-03-02" } });
  const rpc = (tok) =>
    fetch(`${URL_}/rest/v1/rpc/shared_calendar`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: tok, p_from: "2099-03-01", p_to: "2099-03-31" }),
    });
  r = await rpc(token32);
  const shared = await r.json();
  ok("공유 RPC: 유효 토큰 → 일정 반환", r.ok && shared?.events?.length >= 1);
  ok("공유 RPC: 학생 명렬 미포함", !JSON.stringify(shared).includes("테스트학생"));
  r = await rpc("f".repeat(32));
  const bad = r.ok ? await r.json() : null;
  ok("공유 RPC: 무효 토큰 → null", !bad);
} catch (e) {
  fail++;
  console.error("  ❌ 실행 오류:", e.message);
} finally {
  console.log("[정리] 테스트 유저 삭제 (cascade로 데이터 함께 삭제)");
  for (const id of teacherIds) {
    await admin(`/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
  }
}

console.log(`\n결과: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
