import { createClient } from "@/lib/supabase/server";

// ============================================================
// 도구 공통 규약 (M4)
// 모든 학급 도구는 이 헬퍼로 (a) 명렬을 읽고 (b) 결과를 저장하고
// (c) 학생 공개 여부를 토글한다. 도구별 코드는 data 형식만 다르게 쓴다.
// ============================================================

export type Roster = { id: string; number: number; nickname: string }[];

// (a) 표준 명렬 읽기 — 번호순
export async function readRoster(classroomId: string): Promise<Roster> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, number, nickname")
    .eq("classroom_id", classroomId)
    .order("number");
  return data ?? [];
}

// 도구별 설정 읽기/쓰기 (비공개, 담임 전용)
export async function readToolConfig<T>(
  classroomId: string,
  toolKey: string,
): Promise<T | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tool_configs")
    .select("config")
    .eq("classroom_id", classroomId)
    .eq("tool_key", toolKey)
    .maybeSingle();
  return (data?.config as T) ?? null;
}

export async function writeToolConfig(
  classroomId: string,
  toolKey: string,
  config: unknown,
) {
  const supabase = await createClient();
  return supabase
    .from("tool_configs")
    .upsert(
      { classroom_id: classroomId, tool_key: toolKey, config: config as never },
      { onConflict: "classroom_id,tool_key" },
    );
}

// (b) 표준 결과 읽기/저장
export type ToolResult<T> = { data: T; isPublic: boolean } | null;

export async function readToolResult<T>(
  classroomId: string,
  toolKey: string,
): Promise<ToolResult<T>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tool_results")
    .select("data, is_public")
    .eq("classroom_id", classroomId)
    .eq("tool_key", toolKey)
    .maybeSingle();
  if (!data) return null;
  return { data: data.data as T, isPublic: data.is_public };
}

// 결과 저장 시 공개 여부는 유지(기존 값) — 없으면 비공개로 신규 저장
export async function saveToolResult(
  classroomId: string,
  toolKey: string,
  data: unknown,
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tool_results")
    .select("is_public")
    .eq("classroom_id", classroomId)
    .eq("tool_key", toolKey)
    .maybeSingle();

  return supabase.from("tool_results").upsert(
    {
      classroom_id: classroomId,
      tool_key: toolKey,
      data: data as never,
      is_public: existing?.is_public ?? false,
    },
    { onConflict: "classroom_id,tool_key" },
  );
}

// (c) 학생 공개 토글
export async function setToolPublic(
  classroomId: string,
  toolKey: string,
  isPublic: boolean,
) {
  const supabase = await createClient();
  return supabase
    .from("tool_results")
    .update({ is_public: isPublic })
    .eq("classroom_id", classroomId)
    .eq("tool_key", toolKey);
}
