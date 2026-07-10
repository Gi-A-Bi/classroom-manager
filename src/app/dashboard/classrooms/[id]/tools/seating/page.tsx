import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { SeatChart } from "@/components/SeatChart";
import { createClient } from "@/lib/supabase/server";
import type { SeatingConfig, SeatingResult } from "@/lib/tools/seating";
import {
  readRoster,
  readToolConfig,
  readToolResult,
} from "@/lib/tools/shared";
import { clearResult, drawSeating, togglePublic } from "./actions";
import { SeatingConfigForm } from "./SeatingConfigForm";

export default async function SeatingToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; drawn?: string }>;
}) {
  const { id } = await params;
  const { error, saved, drawn } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, theme_color")
    .eq("id", id)
    .single();
  if (!classroom) notFound();

  const [roster, config, result] = await Promise.all([
    readRoster(id),
    readToolConfig<SeatingConfig>(id, "seating"),
    readToolResult<SeatingResult>(id, "seating"),
  ]);

  const nextSeed = Math.floor((Date.now() % 100000) + roster.length * 7);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="tools" />

      <ClassroomHeader
        name={classroom.name}
        title="자리바꾸기"
        themeColor={classroom.theme_color}
      />

      <nav className="-mt-2 text-sm">
        <Link
          href={`/dashboard/classrooms/${classroom.id}/tools`}
          className="text-blue-600 underline"
        >
          ← 도구 서랍
        </Link>
      </nav>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          설정을 저장했어요.
        </p>
      )}
      {drawn && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          새 자리를 뽑았어요. 마음에 안 들면 다시 뽑기를 눌러주세요.
        </p>
      )}

      {roster.length === 0 && (
        <p className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-gray-400">
          먼저 학생 명렬을 등록해주세요.
        </p>
      )}

      {/* 결과 (있으면 위에) */}
      {result && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">🪑 현재 자리표</h2>
            <div className="flex items-center gap-2">
              <form action={togglePublic}>
                <input type="hidden" name="classroom_id" value={classroom.id} />
                <input type="hidden" name="public" value={result.isPublic ? "0" : "1"} />
                <button
                  type="submit"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    result.isPublic
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "border bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {result.isPublic ? "✓ 학생 공개 중" : "학생에게 공개하기"}
                </button>
              </form>
              <form action={clearResult}>
                <input type="hidden" name="classroom_id" value={classroom.id} />
                <button
                  type="submit"
                  className="rounded-lg border px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50"
                >
                  초기화
                </button>
              </form>
            </div>
          </div>
          <SeatChart result={result.data} />
          <p className="text-center text-xs text-gray-400">
            {result.isPublic
              ? "학생 홈의 '우리 반 자리'에 이 자리표가 보여요."
              : "지금은 비공개예요. 공개하기를 누르면 학생이 볼 수 있어요."}
          </p>
        </section>
      )}

      {/* 뽑기 */}
      {roster.length > 0 && config && (
        <section className="flex flex-col items-center gap-2 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">🎲 자리 뽑기</h2>
          <p className="text-sm text-gray-500">
            저장한 설정과 조건에 맞춰 무작위로 배치해요.
          </p>
          <form action={drawSeating}>
            <input type="hidden" name="classroom_id" value={classroom.id} />
            <input type="hidden" name="seed" value={nextSeed} />
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-teal-700"
            >
              {result ? "다시 뽑기" : "자리 뽑기"}
            </button>
          </form>
        </section>
      )}

      {/* 설정 */}
      {roster.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">⚙️ 좌석 배치·조건 설정</h2>
          <SeatingConfigForm
            classroomId={classroom.id}
            students={roster}
            initial={config}
          />
        </section>
      )}
    </main>
  );
}
