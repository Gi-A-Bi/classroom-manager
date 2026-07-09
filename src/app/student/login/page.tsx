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
      <div className="text-center">
        <h1 className="text-3xl font-bold">우리 반 접속</h1>
        <p className="mt-2 text-gray-600">
          선생님께 받은 학급코드로 들어와요.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-center text-red-700">
          {error}
        </p>
      )}

      <form action={studentLogin} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">학급코드</span>
          <input
            type="text"
            name="class_code"
            required
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABC123"
            className="rounded-xl border-2 p-4 text-center font-mono text-2xl uppercase tracking-widest"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">출석번호</span>
          <input
            type="number"
            name="number"
            required
            min={1}
            max={99}
            inputMode="numeric"
            placeholder="7"
            className="rounded-xl border-2 p-4 text-center text-2xl"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">PIN (숫자 4자리)</span>
          <input
            type="password"
            name="pin"
            required
            maxLength={4}
            pattern="\d{4}"
            inputMode="numeric"
            placeholder="••••"
            className="rounded-xl border-2 p-4 text-center text-2xl tracking-widest"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-xl bg-blue-600 p-4 text-lg font-bold text-white active:bg-blue-800"
        >
          들어가기
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        처음이라면 PIN은 선생님이 알려준 번호(보통 0000)예요.
      </p>
    </main>
  );
}
