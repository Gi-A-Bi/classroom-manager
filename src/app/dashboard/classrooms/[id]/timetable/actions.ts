"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DAYS, MAX_PERIODS, MIN_PERIODS } from "./constants";

export async function saveTimetable(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/timetable`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 교시 수는 폼 값이 아니라 학급 설정을 기준으로 한다
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("periods_per_day")
    .eq("id", classroomId)
    .single();
  if (!classroom) redirect("/dashboard");

  const rows: {
    classroom_id: string;
    day_of_week: number;
    period: number;
    subject: string;
  }[] = [];
  const emptyCells = new Set<string>();

  for (const day of DAYS) {
    for (let period = 1; period <= classroom!.periods_per_day; period++) {
      const subject = String(formData.get(`slot_${day}_${period}`) ?? "")
        .trim()
        .slice(0, 20);
      if (subject) {
        rows.push({
          classroom_id: classroomId,
          day_of_week: day,
          period,
          subject,
        });
      } else {
        emptyCells.add(`${day}-${period}`);
      }
    }
  }

  // 지워진 칸은 삭제, 채워진 칸은 upsert — 두 호출 모두 RLS 적용
  const { data: existing } = await supabase
    .from("timetable_slots")
    .select("id, day_of_week, period")
    .eq("classroom_id", classroomId);

  const toDelete =
    existing
      ?.filter((s) => emptyCells.has(`${s.day_of_week}-${s.period}`))
      .map((s) => s.id) ?? [];

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("timetable_slots")
      .delete()
      .in("id", toDelete);
    if (error) {
      redirect(base + "?error=" + encodeURIComponent("시간표 저장에 실패했습니다."));
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("timetable_slots")
      .upsert(rows, { onConflict: "classroom_id,day_of_week,period" });
    if (error) {
      redirect(base + "?error=" + encodeURIComponent("시간표 저장에 실패했습니다."));
    }
  }

  revalidatePath(base);
  redirect(base + "?success=" + encodeURIComponent("시간표를 저장했습니다."));
}

// 하루 교시 수 변경. 줄이면 초과 교시의 시간표는 삭제된다.
export async function setPeriodsPerDay(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const periods = Number(formData.get("periods_per_day"));
  const base = `/dashboard/classrooms/${classroomId}/timetable`;

  if (
    !Number.isInteger(periods) ||
    periods < MIN_PERIODS ||
    periods > MAX_PERIODS
  ) {
    redirect(base + "?error=" + encodeURIComponent("교시 수는 4~8 사이여야 합니다."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("classrooms")
    .update({ periods_per_day: periods })
    .eq("id", classroomId);

  if (error) {
    redirect(base + "?error=" + encodeURIComponent("교시 수 변경에 실패했습니다."));
  }

  // 줄어든 범위 밖의 시간표 정리
  await supabase
    .from("timetable_slots")
    .delete()
    .eq("classroom_id", classroomId)
    .gt("period", periods);

  revalidatePath(base);
  redirect(base + "?success=" + encodeURIComponent(`하루 ${periods}교시로 설정했습니다.`));
}
