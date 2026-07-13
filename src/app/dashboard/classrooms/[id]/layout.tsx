import { QuickRecord } from "@/components/QuickRecord";
import { createClient } from "@/lib/supabase/server";

// 학급 운영 모드 전역 레이아웃 — 어느 화면에서든 "빠른 기록" 버튼 상시 노출.
export default async function ClassroomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // classroom 접근권은 RLS가 강제 — 남의 학급이면 students가 빈 배열이라 버튼만 안 뜬다
  const [{ data: students }, { data: subjects }, { data: customTypes }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, number, nickname")
        .eq("classroom_id", id)
        .order("number"),
      supabase
        .from("subjects")
        .select("name")
        .eq("classroom_id", id)
        .order("position"),
      supabase
        .from("record_types")
        .select("id, label")
        .order("sort_order"),
    ]);

  return (
    <>
      {children}
      {students && students.length > 0 && (
        <QuickRecord
          classroomId={id}
          students={students}
          subjects={(subjects ?? []).map((s) => s.name)}
          customTypes={customTypes ?? []}
        />
      )}
    </>
  );
}
