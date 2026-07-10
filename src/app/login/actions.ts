"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    redirect("/login?error=" + encodeURIComponent("이메일 또는 비밀번호가 올바르지 않습니다."));
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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    const message =
      error.code === "user_already_exists"
        ? "이미 가입된 이메일입니다."
        : "가입에 실패했습니다. 잠시 후 다시 시도해주세요.";
    redirect("/signup?error=" + encodeURIComponent(message));
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
