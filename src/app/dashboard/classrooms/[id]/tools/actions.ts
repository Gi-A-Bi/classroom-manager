"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { THEMES } from "@/lib/themes";

// 도구 = 교사 개인 소유 링크 카드 (모든 학급 공통). 학급 페이지에서 관리하지만
// classroomId는 되돌아갈 경로용일 뿐, 데이터는 teacher_id 소유.

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

function base(classroomId: string) {
  return `/dashboard/classrooms/${classroomId}/tools`;
}

export async function addTool(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 50);
  const url = String(formData.get("url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const color = String(formData.get("color") ?? "blue");

  if (!name || !/^https?:\/\//.test(url)) {
    redirect(base(classroomId) + "?error=" + encodeURIComponent("이름과 http(s):// 주소를 입력해주세요."));
  }

  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("class_tools")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from("class_tools").insert({
    teacher_id: user.id,
    name,
    url,
    description,
    color: color in THEMES ? color : "blue",
    position: count ?? 0,
  });

  if (error) {
    redirect(base(classroomId) + "?error=" + encodeURIComponent("등록에 실패했습니다."));
  }
  revalidatePath(base(classroomId));
  redirect(base(classroomId));
}

export async function updateTool(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const toolId = String(formData.get("tool_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 50);
  const url = String(formData.get("url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const color = String(formData.get("color") ?? "blue");

  if (!name || !/^https?:\/\//.test(url)) {
    redirect(base(classroomId) + "?error=" + encodeURIComponent("이름과 http(s):// 주소를 입력해주세요."));
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("class_tools")
    .update({ name, url, description, color: color in THEMES ? color : "blue" })
    .eq("id", toolId);

  if (error) {
    redirect(base(classroomId) + "?error=" + encodeURIComponent("수정에 실패했습니다."));
  }
  revalidatePath(base(classroomId));
  redirect(base(classroomId));
}

export async function deleteTool(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const toolId = String(formData.get("tool_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("class_tools").delete().eq("id", toolId);
  revalidatePath(base(classroomId));
  redirect(base(classroomId));
}

export async function toggleVisible(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const toolId = String(formData.get("tool_id") ?? "");
  const value = String(formData.get("value")) === "1";
  const { supabase } = await requireUser();
  await supabase
    .from("class_tools")
    .update({ is_student_visible: value })
    .eq("id", toolId);
  revalidatePath(base(classroomId));
  redirect(base(classroomId));
}

export async function toggleFavorite(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const toolId = String(formData.get("tool_id") ?? "");
  const value = String(formData.get("value")) === "1";
  const { supabase } = await requireUser();
  await supabase
    .from("class_tools")
    .update({ is_favorite: value })
    .eq("id", toolId);
  revalidatePath(base(classroomId));
  revalidatePath("/dashboard");
  redirect(base(classroomId));
}

// 순서 변경: 인접 카드와 position 교환
export async function moveTool(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const toolId = String(formData.get("tool_id") ?? "");
  const dir = String(formData.get("dir")); // up | down

  const { supabase } = await requireUser();
  const { data: tools } = await supabase
    .from("class_tools")
    .select("id, position")
    .order("position");
  if (!tools) redirect(base(classroomId));

  const idx = tools.findIndex((t) => t.id === toolId);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= tools.length) {
    redirect(base(classroomId));
  }

  const a = tools[idx];
  const b = tools[swapIdx];
  // position 교환 (충돌 피하려 임시값 경유)
  await supabase.from("class_tools").update({ position: -1 }).eq("id", a.id);
  await supabase.from("class_tools").update({ position: a.position }).eq("id", b.id);
  await supabase.from("class_tools").update({ position: b.position }).eq("id", a.id);

  revalidatePath(base(classroomId));
  redirect(base(classroomId));
}
