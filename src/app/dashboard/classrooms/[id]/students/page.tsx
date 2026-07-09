import { notFound, redirect } from "next/navigation";
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
      .select("id, name, class_code")
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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <ClassroomNav classroomId={classroom.id} current="students" />

      <header>
        <h1 className="text-2xl font-bold">{classroom.name} 학생 명렬</h1>
        <p className="mt-1 text-sm text-gray-600">
          학급코드{" "}
          <code className="rounded bg-gray-100 px-2 py-1 font-mono font-bold">
            {classroom.class_code}
          </code>{" "}
          — 학생들은 이 코드와 번호, PIN으로 접속합니다.
        </p>
      </header>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">명렬 일괄 등록</h2>
        <p className="text-sm text-gray-600">
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
            className="rounded-md border p-2 font-mono text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            초기 PIN (숫자 4자리, 전체 공통)
            <input
              type="text"
              name="pin"
              required
              pattern="\d{4}"
              maxLength={4}
              defaultValue="0000"
              className="w-20 rounded-md border p-2 text-center font-mono"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            일괄 등록
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">
          등록된 학생 {students?.length ?? 0}명
        </h2>
        {students && students.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span>
                  <span className="mr-2 font-mono text-gray-500">
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
                    className="rounded-md border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    PIN 초기화
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">아직 등록된 학생이 없습니다.</p>
        )}
      </section>
    </main>
  );
}
