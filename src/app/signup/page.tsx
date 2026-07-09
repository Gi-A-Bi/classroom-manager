import Link from "next/link";
import { signup } from "../login/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-5xl">🌱</p>
        <h1 className="mt-2 text-2xl font-extrabold">교사 회원가입</h1>
        <p className="mt-1 text-sm text-gray-500">
          1분이면 우리 반 페이지가 생겨요.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        action={signup}
        className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm">
          이름 (표시 이름)
          <input
            type="text"
            name="display_name"
            required
            className="rounded-md border p-2"
            placeholder="홍길동"
          />
        </label>
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
          비밀번호 (6자 이상)
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-md border p-2"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-md bg-blue-600 p-2 font-medium text-white hover:bg-blue-700"
        >
          가입하기
        </button>
      </form>

      <p className="text-sm text-gray-600">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-blue-600 underline">
          로그인
        </Link>
      </p>
    </main>
  );
}
