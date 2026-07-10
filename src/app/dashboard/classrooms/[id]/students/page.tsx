import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { createClient } from "@/lib/supabase/server";
import { addStudentsBulk, resetStudentPin } from "./actions";

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: students }] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, class_code, theme_color")
      .eq("id", id)
      .single(),
    supabase
      .from("students")
      .select("id, number, nickname, pin_is_initial")
      .eq("classroom_id", id)
      .order("number"),
  ]);

  // RLS 때문에 남의 학급은 조회 자체가 안 된다
  if (!classroom) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="students"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="학생 명렬"
        classCode={classroom.class_code}
        themeColor={classroom.theme_color}
      />
      <p className="-mt-2 text-sm text-ink-soft">
        학생들은 학급코드와 출석번호, PIN으로 접속합니다.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">명렬 일괄 등록</h2>
        <p className="text-sm text-ink-soft">
          한 줄에 한 명씩 「번호 이름」 형식으로 붙여넣어 주세요. 이름 대신
          별명을 써도 됩니다.
        </p>
        <form action={addStudentsBulk} className="flex flex-col gap-3">
          <input type="hidden" name="classroom_id" value={classroom.id} />
          <textarea
            name="roster"
            required
            rows={8}
            placeholder={"1 김하늘\n2 이바다\n3 박구름"}
            className="rounded-lg border border-line bg-paper-soft p-2 font-mono text-sm text-ink placeholder:text-ink-faint"
          />
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            초기 PIN (숫자 4자리, 전체 공통)
            <input
              type="text"
              name="pin"
              required
              pattern="\d{4}"
              maxLength={4}
              defaultValue="0000"
              className="w-20 rounded-lg border border-line bg-paper-soft p-2 text-center font-mono text-ink"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            일괄 등록
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-ink">
          등록된 학생{" "}
          <span className="tabular-nums text-ink-soft">
            {students?.length ?? 0}
          </span>
          명
        </h2>
        {students && students.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-line bg-paper p-2.5 text-sm"
              >
                <span className="text-ink">
                  <span className="mr-2 font-mono text-ink-faint">
                    {s.number}번
                  </span>
                  {s.nickname}
                  <span
                    className={`ml-3 rounded-full px-2 py-0.5 text-xs ${
                      s.pin_is_initial
                        ? "bg-amber-100 text-amber-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {s.pin_is_initial ? "초기 PIN(0000)" : "PIN 설정됨"}
                  </span>
                </span>
                <form action={resetStudentPin}>
                  <input type="hidden" name="student_id" value={s.id} />
                  <input
                    type="hidden"
                    name="classroom_id"
                    value={classroom.id}
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
                  >
                    PIN 초기화
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-hand text-base text-ink-soft">
            아직 등록된 학생이 없습니다.
          </p>
        )}
      </section>
    </main>
  );
}
