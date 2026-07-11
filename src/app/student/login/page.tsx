import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-auth";
import { studentLogin } from "./actions";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const session = await getStudentSession();
  if (session) redirect("/student");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-5">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-soft text-4xl ring-1 ring-line">
          🏫
        </span>
        <h1 className="mt-4 text-3xl font-display text-ink">우리 반 들어가기</h1>
        <p className="mt-2 font-hand text-lg text-ink-soft">
          선생님이 알려준 학급코드를 넣어요.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </p>
      )}

      <form
        action={studentLogin}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5"
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-ink-soft">학급코드</span>
          <input
            type="text"
            name="class_code"
            required
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABC123"
            className="rounded-xl border-2 border-line bg-paper-soft p-4 text-center font-mono text-2xl uppercase tracking-widest text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-ink-soft">출석번호</span>
          <input
            type="number"
            name="number"
            required
            min={1}
            max={99}
            inputMode="numeric"
            placeholder="7"
            className="rounded-xl border-2 border-line bg-paper-soft p-4 text-center text-2xl text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-ink-soft">PIN (숫자 4자리)</span>
          <input
            type="password"
            name="pin"
            required
            maxLength={4}
            pattern="\d{4}"
            inputMode="numeric"
            placeholder="••••"
            className="rounded-xl border-2 border-line bg-paper-soft p-4 text-center text-2xl tracking-widest text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-xl bg-ink p-4 text-lg font-bold text-paper transition-colors hover:bg-ink/85"
        >
          들어가기
        </button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        처음 들어온다면 PIN은 선생님이 알려준 번호(보통 0000)예요.
        <br />
        PIN을 잊었다면 선생님께 말씀드리세요.
      </p>
    </main>
  );
}
