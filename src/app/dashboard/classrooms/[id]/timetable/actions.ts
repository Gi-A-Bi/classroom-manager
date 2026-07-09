"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DAYS, PERIODS } from "./constants";

export async function saveTimetable(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/timetable`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rows: {
    classroom_id: string;
    day_of_week: number;
    period: number;
    subject: string;
  }[] = [];
  const emptyCells = new Set<string>();

  for (const day of DAYS) {
    for (const period of PERIODS) {
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
