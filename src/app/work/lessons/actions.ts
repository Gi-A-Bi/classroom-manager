"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDaysString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// 이 학급이 로그인 교사 소유인지 확인 (RLS가 이미 강제하지만 조기 차단)
async function assertOwnsClassroom(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  classroomId: string,
) {
  const { data } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .maybeSingle();
  return Boolean(data);
}

// 과목 선택값을 실제 subject_id로 변환.
//  - "" → null
//  - "new:이름" → 시간표 과목. 이 학급 과목 목록에 없으면 자동 추가(find-or-create)
//  - uuid → 이 학급 과목인지 검증 후 사용
async function resolveSubjectId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  classroomId: string,
  raw: string,
): Promise<string | null> {
  if (!raw) return null;

  if (raw.startsWith("new:")) {
    const name = raw.slice(4).trim().slice(0, 30);
    if (!name) return null;
    // 이미 같은 이름 과목이 있으면 재사용
    const { data: existing } = await supabase
      .from("subjects")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("name", name)
      .maybeSingle();
    if (existing) return existing.id;
    // 없으면 성적 과목 목록에 추가 (position은 맨 뒤)
    const { count } = await supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .eq("classroom_id", classroomId);
    const { data: created } = await supabase
      .from("subjects")
      .insert({ classroom_id: classroomId, name, position: count ?? 0 })
      .select("id")
      .single();
    if (created) return created.id;
    // 동시 저장 등으로 실패하면 다시 조회
    const { data: refetch } = await supabase
      .from("subjects")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("name", name)
      .maybeSingle();
    return refetch?.id ?? null;
  }

  const { data } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", raw)
    .eq("classroom_id", classroomId)
    .maybeSingle();
  return data ? raw : null;
}

function gridUrl(classroomId: string, week: string, extra = "") {
  return `/work/lessons?class=${classroomId}&week=${week}${extra}`;
}

// --- 칸 저장 (단원/계획/메모/완료) — (학급,날짜,교시) upsert ---
export async function saveLessonPlan(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const planDate = String(formData.get("plan_date") ?? "");
  const period = Number(formData.get("period") ?? 0);
  const week = String(formData.get("week") ?? "");
  const subjectRaw = String(formData.get("subject_id") ?? "");
  const unit = String(formData.get("unit") ?? "").trim().slice(0, 120);
  const plan = String(formData.get("plan") ?? "").trim().slice(0, 2000);
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  const done = formData.get("done") === "on" || formData.get("done") === "1";
  const back = gridUrl(classroomId, week);

  if (!DATE_RE.test(planDate) || !(period >= 1 && period <= 8)) redirect(back);

  const { supabase } = await requireUser();
  if (!(await assertOwnsClassroom(supabase, classroomId))) redirect("/work/lessons");

  const subjectId = await resolveSubjectId(supabase, classroomId, subjectRaw);

  const { error } = await supabase.from("lesson_plans").upsert(
    {
      classroom_id: classroomId,
      plan_date: planDate,
      period,
      subject_id: subjectId,
      unit,
      plan,
      note,
      done,
      done_at: done ? new Date().toISOString() : null,
    },
    { onConflict: "classroom_id,plan_date,period" },
  );

  if (error) {
    redirect(back + "&error=" + encodeURIComponent("저장에 실패했습니다."));
  }
  revalidatePath("/work");
  revalidatePath("/work/lessons");
  redirect(back);
}

// --- "계획대로 완료" 원클릭 토글 ---
export async function toggleLessonDone(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const week = String(formData.get("week") ?? "");
  const back = String(formData.get("back") ?? gridUrl(classroomId, week));

  const { supabase } = await requireUser();
  const { data: row } = await supabase
    .from("lesson_plans")
    .select("id, done")
    .eq("id", planId)
    .maybeSingle();
  if (!row) redirect(back);

  await supabase
    .from("lesson_plans")
    .update({
      done: !row.done,
      done_at: !row.done ? new Date().toISOString() : null,
    })
    .eq("id", planId);

  revalidatePath("/work");
  revalidatePath("/work/lessons");
  redirect(back);
}

// --- 칸 비우기 (계획 삭제) ---
export async function deleteLessonPlan(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const week = String(formData.get("week") ?? "");
  const back = gridUrl(classroomId, week);

  const { supabase } = await requireUser();
  await supabase.from("lesson_plans").delete().eq("id", planId);

  revalidatePath("/work");
  revalidatePath("/work/lessons");
  redirect(back);
}

// --- 계획을 다른 날짜/교시로 미루기(이동) ---
export async function moveLessonPlan(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const week = String(formData.get("week") ?? "");
  const targetDate = String(formData.get("target_date") ?? "");
  const targetPeriod = Number(formData.get("target_period") ?? 0);
  const back = gridUrl(classroomId, week);

  if (!DATE_RE.test(targetDate) || !(targetPeriod >= 1 && targetPeriod <= 8)) {
    redirect(back + "&error=" + encodeURIComponent("옮길 날짜와 교시를 확인해주세요."));
  }

  const { supabase } = await requireUser();

  // 옮길 칸이 이미 차 있으면 거부
  const { data: occupied } = await supabase
    .from("lesson_plans")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("plan_date", targetDate)
    .eq("period", targetPeriod)
    .maybeSingle();
  if (occupied) {
    redirect(back + "&error=" + encodeURIComponent("그 칸에는 이미 계획이 있어요."));
  }

  const { error } = await supabase
    .from("lesson_plans")
    .update({ plan_date: targetDate, period: targetPeriod })
    .eq("id", planId)
    .eq("classroom_id", classroomId);

  if (error) {
    redirect(back + "&error=" + encodeURIComponent("이동에 실패했습니다."));
  }
  revalidatePath("/work");
  revalidatePath("/work/lessons");
  redirect(back);
}

// --- 지난주 계획을 이번 주로 복사 (같은 요일·교시, 빈 칸만) ---
// 실행 메모·완료는 복사하지 않는다(계획만 이어가기). 과목·단원·계획 내용만.
export async function copyPreviousWeek(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const week = String(formData.get("week") ?? ""); // 이번 주 월요일
  const back = gridUrl(classroomId, week);

  if (!DATE_RE.test(week)) redirect(back);

  const { supabase } = await requireUser();
  if (!(await assertOwnsClassroom(supabase, classroomId))) redirect("/work/lessons");

  const prevMon = addDaysString(week, -7);
  const prevFri = addDaysString(prevMon, 4);
  const thisFri = addDaysString(week, 4);

  const [{ data: prev }, { data: current }] = await Promise.all([
    supabase
      .from("lesson_plans")
      .select("plan_date, period, subject_id, unit, plan")
      .eq("classroom_id", classroomId)
      .gte("plan_date", prevMon)
      .lte("plan_date", prevFri),
    supabase
      .from("lesson_plans")
      .select("plan_date, period")
      .eq("classroom_id", classroomId)
      .gte("plan_date", week)
      .lte("plan_date", thisFri),
  ]);

  const taken = new Set(
    (current ?? []).map((c) => `${c.plan_date}:${c.period}`),
  );

  const rows = (prev ?? [])
    .map((p) => ({
      classroom_id: classroomId,
      plan_date: addDaysString(p.plan_date, 7), // 같은 요일 이번 주
      period: p.period,
      subject_id: p.subject_id,
      unit: p.unit,
      plan: p.plan,
    }))
    .filter((r) => !taken.has(`${r.plan_date}:${r.period}`));

  if (rows.length > 0) {
    await supabase.from("lesson_plans").insert(rows);
  }

  revalidatePath("/work");
  revalidatePath("/work/lessons");
  redirect(
    back +
      "&msg=" +
      encodeURIComponent(
        rows.length > 0
          ? `지난주 계획 ${rows.length}칸을 복사했어요.`
          : "복사할 새 계획이 없어요.",
      ),
  );
}
