"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("이메일과 비밀번호를 입력해주세요."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 원인을 뭉뚱그리면 "비밀번호가 틀렸다"로만 보여 사용자가 헤맨다.
    // 특히 Supabase 프로젝트가 무료 플랜에서 자동 일시중지되면 요청 자체가
    // 실패하는데, 이것까지 자격 오류로 보이면 멀쩡한 비밀번호를 의심하게 된다.
    const message = isAuthRetryableFetchError(error)
      ? "서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요. (비밀번호 문제가 아닐 수 있어요)"
      : error.code === "email_not_confirmed"
        ? "가입 확인 메일의 링크를 아직 누르지 않으셨어요. 메일함을 확인해주세요."
        : error.code === "over_request_rate_limit"
          ? "로그인 시도가 너무 잦아요. 잠시 후 다시 시도해주세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다. 비밀번호가 기억나지 않으면 아래 '비밀번호를 잊으셨나요?'를 눌러주세요.";
    redirect("/login?error=" + encodeURIComponent(message));
  }

  // 마지막 사용 모드로 진입
  const { data: profile } = await supabase
    .from("profiles")
    .select("last_mode")
    .eq("id", data!.user.id)
    .single();

  revalidatePath("/", "layout");
  redirect(profile?.last_mode === "work" ? "/work" : "/dashboard");
}

export async function signup(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!displayName || !email || !password) {
    redirect("/signup?error=" + encodeURIComponent("모든 항목을 입력해주세요."));
  }
  if (password.length < 6) {
    redirect("/signup?error=" + encodeURIComponent("비밀번호는 6자 이상이어야 합니다."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    const message = isAuthRetryableFetchError(error)
      ? "서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요."
      : error.code === "user_already_exists"
        ? "이미 가입된 이메일입니다."
        : error.code === "over_email_send_rate_limit"
          ? "확인 메일 발송 한도에 걸렸어요. 1시간 뒤 다시 시도해주세요."
          : error.code === "email_address_invalid"
            ? "사용할 수 없는 이메일 주소예요."
            : "가입에 실패했습니다. 잠시 후 다시 시도해주세요.";
    redirect("/signup?error=" + encodeURIComponent(message));
  }

  // 이메일 확인이 켜진 환경: 가입은 됐지만 세션이 없다 → 안내 화면으로
  if (!data.session) {
    redirect(
      "/signup?notice=" +
        encodeURIComponent(
          "확인 메일을 보냈어요. 메일함에서 링크를 눌러 가입을 완료한 뒤 로그인해주세요.",
        ),
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
