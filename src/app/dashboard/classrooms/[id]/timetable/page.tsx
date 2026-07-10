import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { DAY_NAMES } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";
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

  const theme = getTheme(classroom.theme_color);
  const periods = Array.from(
    { length: classroom.periods_per_day },
    (_, i) => i + 1,
  );

  const subjectOf = new Map(
    (slots ?? []).map((s) => [`${s.day_of_week}-${s.period}`, s.subject]),
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="timetable"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="시간표"
        themeColor={classroom.theme_color}
      />
      <p className="-mt-2 text-sm text-ink-soft">
        과목을 입력하고 저장하세요. 비워두면 해당 교시는 지워집니다.
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

      <form
        action={setPeriodsPerDay}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper p-3.5 text-sm text-ink-soft"
      >
        <input type="hidden" name="classroom_id" value={classroom.id} />
        <label className="flex items-center gap-2">
          하루 교시 수
          <select
            name="periods_per_day"
            defaultValue={classroom.periods_per_day}
            className="rounded-lg border border-line bg-paper-soft p-1.5 text-ink"
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
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-soft"
        >
          변경
        </button>
        <span className="text-xs text-ink-faint">
          교시 수를 줄이면 그 아래 교시의 시간표는 지워집니다.
        </span>
      </form>

      <form action={saveTimetable} className="flex flex-col gap-4">
        <input type="hidden" name="classroom_id" value={classroom.id} />
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper p-3">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th className={`w-12 border border-line p-2 ${theme.soft} ${theme.text}`}>
                  교시
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className={`border border-line p-2 ${theme.soft} ${theme.text}`}
                  >
                    {DAY_NAMES[day - 1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period}>
                  <th
                    className={`border border-line bg-paper-soft p-2 font-bold tabular-nums ${theme.text}`}
                  >
                    {period}
                  </th>
                  {DAYS.map((day) => (
                    <td key={day} className="border border-line p-1">
                      <input
                        type="text"
                        name={`slot_${day}_${period}`}
                        maxLength={20}
                        defaultValue={subjectOf.get(`${day}-${period}`) ?? ""}
                        className="w-full min-w-16 rounded p-1.5 text-center text-ink focus:bg-paper-soft focus:outline-none"
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
          className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
        >
          시간표 저장
        </button>
      </form>
    </main>
  );
}
