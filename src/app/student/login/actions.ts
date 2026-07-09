"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  clearStudentSession,
  createStudentToken,
  setPinSetupCookie,
  setStudentSessionCookie,
} from "@/lib/student-auth";

export async function studentLogin(formData: FormData) {
  const classCode = String(formData.get("class_code") ?? "")
    .trim()
    .toUpperCase();
  const number = Number(formData.get("number"));
  const pin = String(formData.get("pin") ?? "").trim();

  const fail = (message: string): never =>
    redirect("/student/login?error=" + encodeURIComponent(message));

  if (!/^[A-Z0-9]{6}$/.test(classCode)) {
    fail("학급코드는 6자리 영문·숫자예요.");
  }
  if (!Number.isInteger(number) || number < 1 || number > 99) {
    fail("출석번호를 확인해주세요.");
  }
  if (!/^\d{4}$/.test(pin)) {
    fail("PIN은 숫자 4자리예요.");
  }

  // PIN 해시 검증은 서버 전용(service_role) 경로 — 유일한 RLS 우회 지점
  const admin = createAdminClient();

  const { data: classroom } = await admin
    .from("classrooms")
    .select("id")
    .eq("class_code", classCode)
    .maybeSingle();

  // 학급/번호/PIN 어느 것이 틀렸는지 노출하지 않는다
  const WRONG = "학급코드, 번호, PIN을 다시 확인해주세요.";
  if (!classroom) fail(WRONG);

  const { data: student } = await admin
    .from("students")
    .select("id, classroom_id, number, nickname, pin_hash, pin_is_initial")
    .eq("classroom_id", classroom!.id)
    .eq("number", number)
    .maybeSingle();

  if (!student) fail(WRONG);

  const pinOk = await compare(pin, student!.pin_hash);
  if (!pinOk) fail(WRONG);

  // 초기 PIN이면 로그인 완료 전에 새 PIN 설정을 강제
  if (student!.pin_is_initial) {
    await setPinSetupCookie(student!.id);
    redirect("/student/new-pin");
  }

  const token = await createStudentToken({
    studentId: student!.id,
    classroomId: student!.classroom_id,
    number: student!.number,
    nickname: student!.nickname,
  });
  await setStudentSessionCookie(token);
  redirect("/student");
}

export async function studentLogout() {
  await clearStudentSession();
  redirect("/student/login");
}
