"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  const fail = (message: string): never =>
    redirect("/reset-password?error=" + encodeURIComponent(message));

  if (password.length < 6) fail("비밀번호는 6자 이상이어야 합니다.");
  if (password !== passwordConfirm) fail("두 번 입력한 비밀번호가 서로 달라요.");

  const supabase = await createClient();

  // 재설정 링크로 만들어진 세션이 있어야만 바꿀 수 있다.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("링크가 만료되었어요. 재설정 메일을 다시 요청해주세요."),
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message =
      error.code === "same_password"
        ? "지금 쓰던 것과 다른 비밀번호를 입력해주세요."
        : error.code === "weak_password"
          ? "너무 쉬운 비밀번호예요. 조금 더 복잡하게 정해주세요."
          : "비밀번호 변경에 실패했어요. 잠시 후 다시 시도해주세요.";
    fail(message);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
