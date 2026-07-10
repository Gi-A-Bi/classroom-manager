"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateSeating, type SeatingConfig } from "@/lib/tools/seating";
import {
  readRoster,
  readToolConfig,
  saveToolResult,
  setToolPublic,
  writeToolConfig,
} from "@/lib/tools/shared";

const TOOL = "seating";

async function requireTeacher(classroomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // 소유 확인 (RLS도 강제하지만 조기 차단)
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .maybeSingle();
  if (!classroom) redirect("/dashboard");
}

// 좌석 배치·조건 저장 (폼에서 JSON payload로 전달)
export async function saveConfig(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const payload = String(formData.get("config") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/tools/seating`;

  await requireTeacher(classroomId);

  let config: SeatingConfig;
  try {
    config = JSON.parse(payload);
  } catch {
    redirect(base + "?error=" + encodeURIComponent("설정을 저장하지 못했어요."));
  }
  // 범위 방어
  config!.rows = Math.max(1, Math.min(10, Number(config!.rows) || 4));
  config!.cols = Math.max(1, Math.min(10, Number(config!.cols) || 5));

  const { error } = await writeToolConfig(classroomId, TOOL, config!);
  if (error) {
    redirect(base + "?error=" + encodeURIComponent("설정 저장에 실패했어요."));
  }
  revalidatePath(base);
  redirect(base + "?saved=1");
}

// 뽑기: 조건 만족 배치를 생성해 임시 미리보기로 저장(비공개 유지).
// 확정 전까지 tool_results에 저장하되 공개 안 함 → 재실행 반복 가능.
export async function drawSeating(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const seed = Number(formData.get("seed") ?? Date.now() % 100000);
  const base = `/dashboard/classrooms/${classroomId}/tools/seating`;

  await requireTeacher(classroomId);

  const config = await readToolConfig<SeatingConfig>(classroomId, TOOL);
  if (!config) {
    redirect(base + "?error=" + encodeURIComponent("먼저 좌석 배치를 설정해주세요."));
  }
  const roster = await readRoster(classroomId);
  if (roster.length === 0) {
    redirect(base + "?error=" + encodeURIComponent("학생 명렬이 필요해요."));
  }

  const outcome = generateSeating(roster, config!, seed);
  if (!outcome.ok) {
    redirect(base + "?error=" + encodeURIComponent(outcome.error));
  }

  const { error } = await saveToolResult(classroomId, TOOL, outcome.result);
  if (error) {
    redirect(base + "?error=" + encodeURIComponent("배치 저장에 실패했어요."));
  }
  revalidatePath(base);
  redirect(base + "?drawn=1");
}

// 학생 공개 토글
export async function togglePublic(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const makePublic = String(formData.get("public")) === "1";
  const base = `/dashboard/classrooms/${classroomId}/tools/seating`;

  await requireTeacher(classroomId);
  const { error } = await setToolPublic(classroomId, TOOL, makePublic);
  if (error) {
    redirect(base + "?error=" + encodeURIComponent("공개 설정에 실패했어요."));
  }
  revalidatePath(base);
  revalidatePath(`/dashboard/classrooms/${classroomId}/tools`);
  redirect(base);
}

// 배치 결과 삭제(초기화)
export async function clearResult(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/tools/seating`;

  await requireTeacher(classroomId);
  const supabase = await createClient();
  await supabase
    .from("tool_results")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("tool_key", TOOL);
  revalidatePath(base);
  redirect(base);
}
