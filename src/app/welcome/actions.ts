"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { THEMES } from "@/lib/themes";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateClassCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// 3월 이후면 올해, 1~2월이면 지난해가 현재 학년도
function currentSchoolYear() {
  const now = new Date();
  return now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// 현재 학년도 레코드를 찾거나 만든다 (온보딩에서 학년도 개념을 감춘다)
async function ensureAcademicYear(
  supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"],
  teacherId: string,
) {
  const year = currentSchoolYear();
  const { data: existing } = await supabase
    .from("academic_years")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("year", year)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("academic_years")
    .insert({ teacher_id: teacherId, year, name: `${year}학년도` })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id;
}

async function insertClassroom(
  supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"],
  teacherId: string,
  academicYearId: string,
  name: string,
  themeColor: string,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("classrooms")
      .insert({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        name,
        class_code: generateClassCode(),
        theme_color: themeColor,
      })
      .select("id")
      .single();
    if (!error && data) return data.id;
    if (error?.code !== "23505") break; // 코드 충돌만 재시도
  }
  return null;
}

async function markOnboarded(
  supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"],
  userId: string,
) {
  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId);
}

// --- 1단계: 학급 만들기 ---
export async function startClassroom(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const themeColor = String(formData.get("theme_color") ?? "blue");

  if (!name) {
    redirect("/welcome?error=" + encodeURIComponent("학급 이름을 입력해주세요."));
  }
  const theme = themeColor in THEMES ? themeColor : "blue";

  const { supabase, user } = await requireTeacher();
  const yearId = await ensureAcademicYear(supabase, user.id);
  if (!yearId) {
    redirect("/welcome?error=" + encodeURIComponent("학급을 만들지 못했어요. 다시 시도해주세요."));
  }
  const classId = await insertClassroom(supabase, user.id, yearId!, name, theme);
  if (!classId) {
    redirect("/welcome?error=" + encodeURIComponent("학급을 만들지 못했어요. 다시 시도해주세요."));
  }

  revalidatePath("/dashboard");
  redirect(`/welcome?step=2&class=${classId}`);
}

// --- 2단계: 명렬 등록 (초기 PIN 0000) ---
export async function addRoster(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const roster = String(formData.get("roster") ?? "");
  const base = `/welcome?step=2&class=${classroomId}`;

  const lines = roster
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    redirect(base + "&error=" + encodeURIComponent("한 줄에 한 명씩 「번호 이름」을 입력해주세요."));
  }

  const parsed: { number: number; nickname: string }[] = [];
  const invalid: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(\d{1,2})[\s.,\t]+(.+)$/);
    if (!m) {
      invalid.push(line);
      continue;
    }
    const number = Number(m[1]);
    const nickname = m[2].trim();
    if (number < 1 || number > 99 || !nickname) invalid.push(line);
    else parsed.push({ number, nickname });
  }
  if (invalid.length > 0) {
    redirect(
      base +
        "&error=" +
        encodeURIComponent(`형식이 이상한 줄이 있어요: ${invalid.slice(0, 3).join(" / ")}`),
    );
  }
  const numbers = parsed.map((s) => s.number);
  if (new Set(numbers).size !== numbers.length) {
    redirect(base + "&error=" + encodeURIComponent("번호가 겹치는 줄이 있어요."));
  }

  const { supabase } = await requireTeacher();
  const pinHash = await hash("0000", 10);
  const { error } = await supabase.from("students").insert(
    parsed.map((s) => ({
      classroom_id: classroomId,
      number: s.number,
      nickname: s.nickname,
      pin_hash: pinHash,
    })),
  );
  if (error) {
    redirect(base + "&error=" + encodeURIComponent("학생 등록에 실패했어요. 다시 시도해주세요."));
  }

  revalidatePath(`/dashboard/classrooms/${classroomId}/students`);
  redirect(`/welcome?step=3&class=${classroomId}`);
}

// --- 완료 ---
export async function finishOnboarding(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const { supabase, user } = await requireTeacher();
  await markOnboarded(supabase, user.id);
  revalidatePath("/dashboard");
  redirect(classroomId ? `/dashboard/classrooms/${classroomId}` : "/dashboard");
}

// --- 나중에 하기(건너뛰기) ---
export async function skipOnboarding() {
  const { supabase, user } = await requireTeacher();
  await markOnboarded(supabase, user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// --- 예시 학급으로 둘러보기 ---
export async function createSampleClassroom() {
  const { supabase, user } = await requireTeacher();
  const yearId = await ensureAcademicYear(supabase, user.id);
  if (!yearId) {
    redirect("/welcome?error=" + encodeURIComponent("예시 학급을 만들지 못했어요."));
  }
  const classId = await insertClassroom(supabase, user.id, yearId!, "예시 학급", "green");
  if (!classId) {
    redirect("/welcome?error=" + encodeURIComponent("예시 학급을 만들지 못했어요."));
  }

  const pinHash = await hash("0000", 10);
  const sampleNames = ["김하늘", "이바다", "박구름", "최별님", "정노을"];
  await supabase.from("students").insert(
    sampleNames.map((nickname, i) => ({
      classroom_id: classId,
      number: i + 1,
      nickname,
      pin_hash: pinHash,
    })),
  );
  await supabase.from("posts").insert({
    classroom_id: classId,
    title: "우리 반 첫 알림장",
    content:
      "학교수첩을 둘러보고 계신 예시 학급이에요.\n알림장·시간표·캘린더를 눌러보고, 다 둘러보면 설정에서 이 학급을 지우면 됩니다.",
    post_date: todayString(),
  });

  await markOnboarded(supabase, user.id);
  revalidatePath("/dashboard");
  redirect(`/dashboard/classrooms/${classId}?tip=sample`);
}
