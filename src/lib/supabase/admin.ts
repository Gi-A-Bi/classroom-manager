import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// 서버 전용: RLS를 우회하는 service_role 클라이언트.
// 학생 커스텀 인증(PIN 검증·변경)에서만 사용한다 — 그 외 데이터 접근은
// 반드시 RLS 적용 클라이언트(server.ts/student.ts)를 통할 것.
// 'use client' 파일에서 import 금지.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
