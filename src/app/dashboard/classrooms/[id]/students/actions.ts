"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// "번호 이름" 형식의 여러 줄을 파싱해 학생을 일괄 등록한다.
// 구분자는 공백/탭/마침표/쉼표 허용 (예: "1 김하늘", "2. 이바다")
export async function addStudentsBulk(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const roster = String(formData.get("roster") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();

  const base = `/dashboard/classrooms/${classroomId}/students`;

  if (!/^\d{4}$/.test(pin)) {
    redirect(base + "?error=" + encodeURIComponent("초기 PIN은 숫자 4자리여야 합니다."));
  }

  const lines = roster
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    redirect(base + "?error=" + encodeURIComponent("등록할 명단을 입력해주세요."));
  }

  const parsed: { number: number; nickname: string }[] = [];
  const invalid: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(\d{1,2})[\s.,\t]+(.+)$/);
    if (!match) {
      invalid.push(line);
      continue;
    }
    const number = Number(match[1]);
    const nickname = match[2].trim();
    if (number < 1 || number > 99 || !nickname) {
      invalid.push(line);
      continue;
    }
    parsed.push({ number, nickname });
  }

  if (invalid.length > 0) {
    redirect(
      base +
        "?error=" +
        encodeURIComponent(
          `형식이 올바르지 않은 줄이 있습니다: ${invalid.slice(0, 3).join(" / ")}` +
            (invalid.length > 3 ? ` 외 ${invalid.length - 3}줄` : ""),
        ),
    );
  }

  const numbers = parsed.map((s) => s.number);
  if (new Set(numbers).size !== numbers.length) {
    redirect(base + "?error=" + encodeURIComponent("번호가 중복된 줄이 있습니다."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 같은 초기 PIN이므로 해시는 한 번만 계산
  const pinHash = await hash(pin, 10);

  const { error } = await supabase.from("students").insert(
    parsed.map((s) => ({
      classroom_id: classroomId,
      number: s.number,
      nickname: s.nickname,
      pin_hash: pinHash,
    })),
  );

  if (error) {
    const message =
      error.code === "23505"
        ? "이미 등록된 번호가 포함되어 있습니다. 기존 명단을 확인해주세요."
        : "학생 등록에 실패했습니다.";
    redirect(base + "?error=" + encodeURIComponent(message));
  }

  revalidatePath(base);
  redirect(base + "?success=" + encodeURIComponent(`${parsed.length}명을 등록했습니다.`));
}
