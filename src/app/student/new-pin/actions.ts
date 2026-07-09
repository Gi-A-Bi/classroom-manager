"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  clearPinSetupCookie,
  createStudentToken,
  getPinSetupStudentId,
  setStudentSessionCookie,
} from "@/lib/student-auth";

export async function setNewPin(formData: FormData) {
  const pin = String(formData.get("pin") ?? "").trim();
  const pinConfirm = String(formData.get("pin_confirm") ?? "").trim();

  const fail = (message: string): never =>
    redirect("/student/new-pin?error=" + encodeURIComponent(message));

  const studentId = await getPinSetupStudentId();
  if (!studentId) {
    redirect(
      "/student/login?error=" +
        encodeURIComponent("시간이 지났어요. 다시 로그인해주세요."),
    );
  }

  if (!/^\d{4}$/.test(pin)) fail("새 PIN은 숫자 4자리예요.");
  if (pin === "0000") fail("0000은 사용할 수 없어요. 다른 번호를 정해주세요.");
  if (pin !== pinConfirm) fail("두 번 입력한 PIN이 서로 달라요.");

  const admin = createAdminClient();
  const pinHash = await hash(pin, 10);

  const { data: student, error } = await admin
    .from("students")
    .update({ pin_hash: pinHash, pin_is_initial: false })
    .eq("id", studentId!)
    .select("id, classroom_id, number, nickname")
    .single();

  if (error || !student) {
    fail("PIN 설정에 실패했어요. 다시 시도해주세요.");
  }

  await clearPinSetupCookie();

  const token = await createStudentToken({
    studentId: student!.id,
    classroomId: student!.classroom_id,
    number: student!.number,
    nickname: student!.nickname,
  });
  await setStudentSessionCookie(token);
  redirect("/student");
}
