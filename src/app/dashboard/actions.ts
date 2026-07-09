"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { THEMES } from "@/lib/themes";

// 학급코드: 혼동하기 쉬운 문자(0/O, 1/I)를 뺀 6자리
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateClassCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function createAcademicYear(formData: FormData) {
  const year = Number(formData.get("year"));

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    redirect("/dashboard?error=" + encodeURIComponent("올바른 연도를 입력해주세요."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("academic_years").insert({
    teacher_id: user.id,
    year,
    name: `${year}학년도`,
  });

  if (error) {
    const message =
      error.code === "23505"
        ? `${year}학년도는 이미 등록되어 있습니다.`
        : "학년도 등록에 실패했습니다.";
    redirect("/dashboard?error=" + encodeURIComponent(message));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createClassroom(formData: FormData) {
  const academicYearId = String(formData.get("academic_year_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const themeColor = String(formData.get("theme_color") ?? "blue");

  if (!academicYearId || !name) {
    redirect("/dashboard?error=" + encodeURIComponent("학년도와 학급 이름을 입력해주세요."));
  }
  if (!(themeColor in THEMES)) {
    redirect("/dashboard?error=" + encodeURIComponent("테마 색을 선택해주세요."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 학급코드 충돌(전역 유니크) 시 몇 번 재시도
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from("classrooms").insert({
      academic_year_id: academicYearId,
      teacher_id: user.id,
      name,
      class_code: generateClassCode(),
      theme_color: themeColor,
    });

    if (!error) {
      revalidatePath("/dashboard");
      redirect("/dashboard");
    }
    lastError = error;
    if (error.code !== "23505") break;
  }

  const message =
    lastError?.code === "23503" || lastError?.code === "42501"
      ? "학급을 만들 권한이 없습니다."
      : "학급 생성에 실패했습니다. 다시 시도해주세요.";
  redirect("/dashboard?error=" + encodeURIComponent(message));
}
