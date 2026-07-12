import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { signup } from "../login/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center text-center">
        <Wordmark size="sm" className="mb-3 opacity-60" />
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-soft text-4xl ring-1 ring-line">
          🌱
        </span>
        <h1 className="mt-4 text-3xl font-display text-ink">교사 회원가입</h1>
        <p className="mt-2 font-hand text-lg text-ink-soft">
          1분이면 우리 반 페이지가 생겨요.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      <form
        action={signup}
        className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-6"
      >
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          이름 (표시 이름)
          <input
            type="text"
            name="display_name"
            required
            className="rounded-lg border border-line bg-paper-soft p-2.5 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            placeholder="홍길동"
          />
        </label>
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
          비밀번호 (6자 이상)
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-lg border border-line bg-paper-soft p-2.5 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-ink p-2.5 font-medium text-paper transition-colors hover:bg-ink/85"
        >
          가입하기
        </button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-ink underline decoration-line-strong underline-offset-2">
          로그인
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
