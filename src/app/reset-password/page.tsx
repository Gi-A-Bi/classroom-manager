import { Wordmark } from "@/components/Wordmark";
import { createClient } from "@/lib/supabase/server";
import { RecoveryHashBridge } from "./RecoveryHashBridge";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center text-center">
        <Wordmark size="sm" className="mb-3 opacity-60" />
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-soft text-4xl ring-1 ring-line">
          🔒
        </span>
        <h1 className="mt-4 text-3xl font-display text-ink">새 비밀번호 정하기</h1>
        <p className="mt-2 font-hand text-lg text-ink-soft">
          {user ? `${user.email} 계정의 비밀번호를 바꿔요.` : "링크를 확인하고 있어요."}
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {user ? (
        <form
          action={updatePassword}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-6"
        >
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            새 비밀번호 (6자 이상)
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-lg border border-line bg-paper-soft p-2.5 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            한 번 더 입력
            <input
              type="password"
              name="password_confirm"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-lg border border-line bg-paper-soft p-2.5 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-ink p-2.5 font-medium text-paper transition-colors hover:bg-ink/85"
          >
            비밀번호 바꾸고 들어가기
          </button>
        </form>
      ) : (
        <RecoveryHashBridge />
      )}
    </main>
  );
}
