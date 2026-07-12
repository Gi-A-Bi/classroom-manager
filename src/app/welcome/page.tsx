import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyCodeChip } from "@/components/CopyCodeChip";
import { Wordmark } from "@/components/Wordmark";
import { createClient } from "@/lib/supabase/server";
import { THEME_KEYS, THEMES } from "@/lib/themes";
import {
  addRoster,
  createSampleClassroom,
  finishOnboarding,
  skipOnboarding,
  startClassroom,
} from "./actions";

function StepDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-2 rounded-full transition-all ${
            n === current ? "w-6 bg-ink" : "w-2 bg-line-strong"
          }`}
        />
      ))}
    </div>
  );
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; class?: string; error?: string }>;
}) {
  const { step, class: classId, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarded_at")
    .eq("id", user.id)
    .single();

  const stepNum = step === "2" ? 2 : step === "3" ? 3 : 1;

  // 1단계인데 이미 온보딩을 마친 교사면 대시보드로 (수동 방문 시 혼선 방지)
  if (stepNum === 1 && profile?.onboarded_at) redirect("/dashboard");

  // 2·3단계는 유효한 내 학급이 있어야 한다 (RLS가 소유 검증)
  let classroom: { id: string; name: string; class_code: string } | null = null;
  if (stepNum >= 2) {
    const { data } = await supabase
      .from("classrooms")
      .select("id, name, class_code")
      .eq("id", classId ?? "")
      .maybeSingle();
    if (!data) redirect("/welcome");
    classroom = data;
  }

  const errorBox = error ? (
    <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {error}
    </p>
  ) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Wordmark size="sm" className="opacity-60" />
        <StepDots current={stepNum} />
      </div>

      {/* ---------- 1단계: 학급 만들기 ---------- */}
      {stepNum === 1 && (
        <>
          <div className="text-center">
            <h1 className="text-2xl font-display text-ink">
              {profile?.display_name || "선생님"} 선생님, 환영해요
            </h1>
            <p className="mt-2 font-hand text-lg text-ink-soft">
              우리 반부터 만들어 볼까요?
            </p>
          </div>

          {errorBox}

          <form
            action={startClassroom}
            className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-6"
          >
            <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
              학급 이름
              <input
                type="text"
                name="name"
                required
                autoFocus
                placeholder="3학년 2반"
                className="rounded-lg border border-line bg-paper-soft p-2.5 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
              />
            </label>

            <fieldset className="flex flex-col gap-2 text-sm text-ink-soft">
              <legend className="mb-1">우리 반 색</legend>
              <div className="flex flex-wrap gap-2">
                {THEME_KEYS.map((key, i) => (
                  <label key={key} className="cursor-pointer" title={THEMES[key].label}>
                    <input
                      type="radio"
                      name="theme_color"
                      value={key}
                      defaultChecked={i === 0}
                      className="peer sr-only"
                    />
                    <span
                      className={`block h-9 w-9 rounded-full ${THEMES[key].swatch} ring-offset-2 transition-transform hover:scale-110 peer-checked:ring-2 peer-checked:ring-ink`}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              className="rounded-lg bg-ink p-2.5 font-medium text-paper transition-colors hover:bg-ink/85"
            >
              다음: 학생 등록 →
            </button>
          </form>

          <div className="flex flex-col items-center gap-3">
            <form action={createSampleClassroom}>
              <button
                type="submit"
                className="text-sm font-medium text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink"
              >
                예시 학급으로 먼저 둘러볼래요
              </button>
            </form>
            <form action={skipOnboarding}>
              <button
                type="submit"
                className="text-sm text-ink-faint underline decoration-line-strong underline-offset-2 hover:text-ink-soft"
              >
                나중에 할게요
              </button>
            </form>
          </div>
        </>
      )}

      {/* ---------- 2단계: 명렬 등록 ---------- */}
      {stepNum === 2 && classroom && (
        <>
          <div className="text-center">
            <h1 className="text-2xl font-display text-ink">{classroom.name} 학생 등록</h1>
            <p className="mt-2 font-hand text-lg text-ink-soft">
              한 줄에 한 명씩, 「번호 이름」으로요.
            </p>
          </div>

          {errorBox}

          <form
            action={addRoster}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-6"
          >
            <input type="hidden" name="classroom_id" value={classroom.id} />
            <textarea
              name="roster"
              required
              rows={7}
              autoFocus
              placeholder={"1 김하늘\n2 이바다\n3 박구름"}
              className="rounded-lg border border-line bg-paper-soft p-2.5 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
            <p className="text-xs text-ink-faint">
              이름 대신 별명도 괜찮아요. 초기 PIN은 모두 0000으로 시작해요.
            </p>
            <button
              type="submit"
              className="rounded-lg bg-ink p-2.5 font-medium text-paper transition-colors hover:bg-ink/85"
            >
              다음: 코드 배부 →
            </button>
          </form>

          <div className="text-center">
            <Link
              href={`/welcome?step=3&class=${classroom.id}`}
              className="text-sm text-ink-faint underline decoration-line-strong underline-offset-2 hover:text-ink-soft"
            >
              학생은 나중에 등록할게요
            </Link>
          </div>
        </>
      )}

      {/* ---------- 3단계: 코드 배부 ---------- */}
      {stepNum === 3 && classroom && (
        <>
          <div className="text-center">
            <span className="text-4xl">🎉</span>
            <h1 className="mt-2 text-2xl font-display text-ink">다 됐어요!</h1>
            <p className="mt-2 font-hand text-lg text-ink-soft">
              학생에게 이 코드를 알려주세요.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper p-6">
            <CopyCodeChip code={classroom.class_code} />
            <p className="text-center text-sm text-ink-soft">
              학생은 <span className="font-semibold text-ink">학교수첩 주소 → 학생</span>
              에서
              <br />
              학급코드 · 출석번호 · PIN(0000)으로 들어가요.
            </p>
          </div>

          <form action={finishOnboarding}>
            <input type="hidden" name="classroom_id" value={classroom.id} />
            <button
              type="submit"
              className="w-full rounded-lg bg-ink p-2.5 font-medium text-paper transition-colors hover:bg-ink/85"
            >
              우리 반으로 가기 →
            </button>
          </form>
        </>
      )}
    </main>
  );
}
