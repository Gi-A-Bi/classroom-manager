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
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-soft text-4xl ring-1 ring-line">
          🏫
        </span>
        <h1 className="mt-4 text-3xl font-display text-ink">교사 로그인</h1>
        <p className="mt-2 font-hand text-lg text-ink-soft">
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
        className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-6"
      >
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          이메일
          <input
            type="email"
            name="email"
            required
            className="rounded-lg border border-line bg-paper-soft p-2.5 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            placeholder="teacher@example.com"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          비밀번호
          <input
            type="password"
            name="password"
            required
            className="rounded-lg border border-line bg-paper-soft p-2.5 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-ink p-2.5 font-medium text-paper transition-colors hover:bg-ink/85"
        >
          로그인
        </button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-ink underline decoration-line-strong underline-offset-2">
          회원가입
        </Link>
      </p>

      <p className="text-center text-sm">
        <Link
          href="/"
          className="text-ink-faint underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink-soft"
        >
          ← 처음 화면으로
        </Link>
      </p>
    </main>
  );
}
