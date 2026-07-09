"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPost(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const postDate = String(formData.get("post_date") ?? "");

  const base = `/dashboard/classrooms/${classroomId}/posts`;

  if (!title || !content) {
    redirect(base + "?error=" + encodeURIComponent("제목과 내용을 입력해주세요."));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postDate)) {
    redirect(base + "?error=" + encodeURIComponent("날짜를 선택해주세요."));
  }

  // 준비물: 한 줄에 하나씩 (선택 입력)
  const itemLabels = String(formData.get("items") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 20);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      classroom_id: classroomId,
      title,
      content,
      post_date: postDate,
    })
    .select("id")
    .single();

  if (error || !post) {
    redirect(base + "?error=" + encodeURIComponent("알림장 저장에 실패했습니다."));
  }

  if (itemLabels.length > 0) {
    const { error: itemError } = await supabase.from("post_items").insert(
      itemLabels.map((label, i) => ({
        post_id: post!.id,
        classroom_id: classroomId,
        label,
        position: i,
      })),
    );
    if (itemError) {
      redirect(
        base +
          "?error=" +
          encodeURIComponent("알림장은 저장됐지만 준비물 등록에 실패했습니다."),
      );
    }
  }

  revalidatePath(base);
  redirect(base + "?success=" + encodeURIComponent("알림장을 등록했습니다."));
}
