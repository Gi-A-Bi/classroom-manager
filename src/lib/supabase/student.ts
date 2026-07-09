import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// 학생 커스텀 JWT로 접근하는 RLS 적용 클라이언트.
// RLS 정책이 JWT의 app_role/classroom_id 클레임을 검사해
// 자기 학급의 공개 데이터만 조회를 허용한다.
export function createStudentClient(token: string) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
