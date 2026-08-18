"use server";

import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/forgot-password?error=" + encodeURIComponent("이메일을 입력해주세요."));
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    const message = isAuthRetryableFetchError(error)
      ? "서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요."
      : error.code === "over_email_send_rate_limit"
        ? "메일 발송 한도에 걸렸어요. 잠시 후 다시 시도해주세요."
        : "메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.";
    redirect("/forgot-password?error=" + encodeURIComponent(message));
  }

  // 가입되지 않은 주소인지 알려주지 않는다(계정 존재 여부 노출 방지).
  redirect(
    "/forgot-password?notice=" +
      encodeURIComponent(
        "가입된 주소라면 재설정 메일을 보냈어요. 메일함(스팸함도)을 확인하고, 메일을 요청한 이 브라우저에서 링크를 열어주세요.",
      ),
  );
}
