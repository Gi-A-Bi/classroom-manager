import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-5xl">🏫</p>
        <h1 className="mt-2 text-2xl font-extrabold">교사 로그인</h1>
        <p className="mt-1 text-sm text-gray-500">
          우리 반을 만들고 운영하는 공간이에요.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        action={login}
        className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <input
            type="email"
            name="email"
            required
            className="rounded-md border p-2"
            placeholder="teacher@example.com"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <input
            type="password"
            name="password"
            required
            className="rounded-md border p-2"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-md bg-blue-600 p-2 font-medium text-white hover:bg-blue-700"
        >
          로그인
        </button>
      </form>

      <p className="text-sm text-gray-600">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="text-blue-600 underline">
          회원가입
        </Link>
      </p>
    </main>
  );
}
