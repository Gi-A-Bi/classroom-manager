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

// PIN을 0000으로 리셋하고 다음 로그인 때 재설정을 강제한다.
// 교사는 자기 학급 학생에 update 권한이 있으므로 RLS 클라이언트로 처리.
export async function resetStudentPin(formData: FormData) {
  const studentId = String(formData.get("student_id") ?? "");
  const classroomId = String(formData.get("classroom_id") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/students`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pinHash = await hash("0000", 10);
  const { data, error } = await supabase
    .from("students")
    .update({ pin_hash: pinHash, pin_is_initial: true })
    .eq("id", studentId)
    .select("number, nickname")
    .single();

  if (error || !data) {
    redirect(base + "?error=" + encodeURIComponent("PIN 초기화에 실패했습니다."));
  }

  revalidatePath(base);
  redirect(
    base +
      "?success=" +
      encodeURIComponent(
        `${data!.number}번 ${data!.nickname}의 PIN을 0000으로 초기화했습니다.`,
      ),
  );
}

// 학급 전체 PIN을 0000으로 초기화 (개학 준비용). 다음 로그인 때 재설정 강제.
export async function resetAllPins(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/students`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pinHash = await hash("0000", 10);
  const { data, error } = await supabase
    .from("students")
    .update({ pin_hash: pinHash, pin_is_initial: true })
    .eq("classroom_id", classroomId)
    .select("id");

  if (error) {
    redirect(base + "?error=" + encodeURIComponent("전체 PIN 초기화에 실패했습니다."));
  }

  revalidatePath(base);
  redirect(
    base +
      "?success=" +
      encodeURIComponent(`전체 ${data?.length ?? 0}명의 PIN을 0000으로 초기화했습니다.`),
  );
}
