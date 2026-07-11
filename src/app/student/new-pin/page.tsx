import { redirect } from "next/navigation";
import { getPinSetupStudentId } from "@/lib/student-auth";
import { setNewPin } from "./actions";

export default async function NewPinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const studentId = await getPinSetupStudentId();
  if (!studentId) redirect("/student/login");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-5">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-soft text-4xl ring-1 ring-line">
          🔑
        </span>
        <h1 className="mt-4 text-3xl font-display text-ink">새 PIN 만들기</h1>
        <p className="mt-2 font-hand text-lg text-ink-soft">
          처음 들어왔네요! 나만 아는 새 PIN을 정해주세요.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </p>
      )}

      <form
        action={setNewPin}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5"
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-ink-soft">새 PIN (숫자 4자리)</span>
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
        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-ink-soft">한 번 더 입력</span>
          <input
            type="password"
            name="pin_confirm"
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
          PIN 정하고 들어가기
        </button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        PIN을 잊어버리면 선생님께 말씀드리세요.
      </p>
    </main>
  );
}
