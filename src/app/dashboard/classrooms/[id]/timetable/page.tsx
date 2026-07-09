import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { DAY_NAMES } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { saveTimetable, setPeriodsPerDay } from "./actions";
import { DAYS, MAX_PERIODS, MIN_PERIODS } from "./constants";

export default async function TimetablePage({
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

  const [{ data: classroom }, { data: slots }] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, periods_per_day, theme_color")
      .eq("id", id)
      .single(),
    supabase
      .from("timetable_slots")
      .select("day_of_week, period, subject")
      .eq("classroom_id", id),
  ]);

  if (!classroom) notFound();

  const periods = Array.from(
    { length: classroom.periods_per_day },
    (_, i) => i + 1,
  );

  const subjectOf = new Map(
    (slots ?? []).map((s) => [`${s.day_of_week}-${s.period}`, s.subject]),
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <ClassroomNav classroomId={classroom.id} current="timetable" />

      <ClassroomHeader
        name={classroom.name}
        title="시간표"
        themeColor={classroom.theme_color}
      />
      <p className="-mt-3 text-sm text-gray-500">
        과목을 입력하고 저장하세요. 비워두면 해당 교시는 지워집니다.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <form
        action={setPeriodsPerDay}
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3.5 text-sm shadow-sm"
      >
        <input type="hidden" name="classroom_id" value={classroom.id} />
        <label className="flex items-center gap-2">
          하루 교시 수
          <select
            name="periods_per_day"
            defaultValue={classroom.periods_per_day}
            className="rounded-md border p-1.5"
          >
            {Array.from(
              { length: MAX_PERIODS - MIN_PERIODS + 1 },
              (_, i) => MIN_PERIODS + i,
            ).map((n) => (
              <option key={n} value={n}>
                {n}교시
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border px-3 py-1.5 hover:bg-gray-50"
        >
          변경
        </button>
        <span className="text-xs text-gray-500">
          교시 수를 줄이면 그 아래 교시의 시간표는 지워집니다.
        </span>
      </form>

      <form action={saveTimetable} className="flex flex-col gap-4">
        <input type="hidden" name="classroom_id" value={classroom.id} />
        <div className="overflow-x-auto rounded-xl border bg-white p-3 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-14 border bg-gray-50 p-2">교시</th>
                {DAYS.map((day) => (
                  <th key={day} className="border bg-gray-50 p-2">
                    {DAY_NAMES[day - 1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period}>
                  <th className="border bg-gray-50 p-2 font-medium">
                    {period}
                  </th>
                  {DAYS.map((day) => (
                    <td key={day} className="border p-1">
                      <input
                        type="text"
                        name={`slot_${day}_${period}`}
                        maxLength={20}
                        defaultValue={subjectOf.get(`${day}-${period}`) ?? ""}
                        className="w-full min-w-16 rounded p-1.5 text-center focus:bg-blue-50"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="submit"
          className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          시간표 저장
        </button>
      </form>
    </main>
  );
}
