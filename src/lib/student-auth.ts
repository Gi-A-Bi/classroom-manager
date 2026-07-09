import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// 학생 세션: 「학급코드+번호+PIN」 검증 후 서버가 서명해 발급하는
// 커스텀 JWT를 httpOnly 쿠키로 보관한다. Supabase 계정 없이 동작하며,
// PostgREST는 role 클레임으로, RLS는 app_role/classroom_id 클레임으로 검사한다.

const SESSION_COOKIE = "student_session";
const PIN_SETUP_COOKIE = "student_pin_setup";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일

function jwtSecret() {
  return new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
}

export type StudentSession = {
  studentId: string;
  classroomId: string;
  number: number;
  nickname: string;
};

export async function createStudentToken(s: StudentSession) {
  return new SignJWT({
    role: "authenticated",
    app_role: "student",
    classroom_id: s.classroomId,
    student_id: s.studentId,
    number: s.number,
    nickname: s.nickname,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(s.studentId)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(jwtSecret());
}

export async function setStudentSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getStudentSession(): Promise<
  (StudentSession & { token: string }) | null
> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      audience: "authenticated",
    });
    if (payload.app_role !== "student") return null;
    return {
      token,
      studentId: String(payload.student_id),
      classroomId: String(payload.classroom_id),
      number: Number(payload.number),
      nickname: String(payload.nickname ?? ""),
    };
  } catch {
    return null;
  }
}

export async function clearStudentSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// --- 초기 PIN 변경 전용 단기 토큰 (로그인 완료 전 단계) ---

export async function setPinSetupCookie(studentId: string) {
  const token = await new SignJWT({ app_role: "student_pin_setup" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(studentId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(jwtSecret());

  const store = await cookies();
  store.set(PIN_SETUP_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function getPinSetupStudentId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(PIN_SETUP_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    if (payload.app_role !== "student_pin_setup" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function clearPinSetupCookie() {
  const store = await cookies();
  store.delete(PIN_SETUP_COOKIE);
}
