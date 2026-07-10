"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// --- 모드 전환 (마지막 사용 모드 기억) ---

export async function switchMode(formData: FormData) {
  const mode = String(formData.get("mode")) === "work" ? "work" : "class";
  const { supabase, user } = await requireUser();

  await supabase.from("profiles").update({ last_mode: mode }).eq("id", user.id);
  redirect(mode === "work" ? "/work" : "/dashboard");
}

// --- 할 일 ---

export async function addTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const dueDate = String(formData.get("due_date") ?? "");
  const priority = Number(formData.get("priority") ?? 2);
  const repeatDow = Number(formData.get("repeat_dow") ?? 0);

  if (!title) {
    redirect("/work/todos?error=" + encodeURIComponent("할 일을 입력해주세요."));
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("work_todos").insert({
    teacher_id: user.id,
    title,
    due_date: DATE_RE.test(dueDate) ? dueDate : null,
    priority: [1, 2, 3].includes(priority) ? priority : 2,
    repeat_dow: repeatDow >= 1 && repeatDow <= 7 ? repeatDow : null,
  });

  if (error) {
    redirect("/work/todos?error=" + encodeURIComponent("등록에 실패했습니다."));
  }
  revalidatePath("/work");
  revalidatePath("/work/todos");
  redirect("/work/todos");
}

// 완료 토글 — 반복 할 일은 "오늘 완료"만 기록한다
export async function toggleTodo(formData: FormData) {
  const todoId = String(formData.get("todo_id") ?? "");
  const back = String(formData.get("back") ?? "/work/todos");

  const { supabase } = await requireUser();
  const { data: todo } = await supabase
    .from("work_todos")
    .select("id, repeat_dow, done_at, last_done_date")
    .eq("id", todoId)
    .maybeSingle();
  if (!todo) redirect(back);

  const today = todayString();
  const patch = todo!.repeat_dow
    ? { last_done_date: todo!.last_done_date === today ? null : today }
    : { done_at: todo!.done_at ? null : new Date().toISOString() };

  await supabase.from("work_todos").update(patch).eq("id", todoId);
  revalidatePath("/work");
  revalidatePath("/work/todos");
  redirect(back);
}

export async function deleteTodo(formData: FormData) {
  const todoId = String(formData.get("todo_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("work_todos").delete().eq("id", todoId);
  revalidatePath("/work");
  revalidatePath("/work/todos");
  redirect("/work/todos");
}

// --- 공문 트래커 ---

export async function addDocument(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 150);
  const receivedDate = String(formData.get("received_date") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const memo = String(formData.get("memo") ?? "").trim().slice(0, 500);
  const link = String(formData.get("link") ?? "").trim();

  if (!title || !DATE_RE.test(receivedDate)) {
    redirect("/work/documents?error=" + encodeURIComponent("제목과 접수일을 입력해주세요."));
  }
  if (link && !/^https?:\/\//.test(link)) {
    redirect("/work/documents?error=" + encodeURIComponent("링크는 http(s)://로 시작해야 합니다."));
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("work_documents").insert({
    teacher_id: user.id,
    title,
    received_date: receivedDate,
    due_date: DATE_RE.test(dueDate) ? dueDate : null,
    memo,
    link: link || null,
  });

  if (error) {
    redirect("/work/documents?error=" + encodeURIComponent("등록에 실패했습니다."));
  }
  revalidatePath("/work");
  revalidatePath("/work/documents");
  redirect("/work/documents");
}

export async function setDocumentStatus(formData: FormData) {
  const docId = String(formData.get("doc_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const back = String(formData.get("back") ?? "/work/documents");

  if (!["received", "in_progress", "done"].includes(status)) redirect(back);

  const { supabase } = await requireUser();
  await supabase.from("work_documents").update({ status }).eq("id", docId);
  revalidatePath("/work");
  revalidatePath("/work/documents");
  redirect(back);
}

export async function deleteDocument(formData: FormData) {
  const docId = String(formData.get("doc_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("work_documents").delete().eq("id", docId);
  revalidatePath("/work");
  revalidatePath("/work/documents");
  redirect("/work/documents");
}

// --- 업무 일정 ---

export async function addWorkEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const category = String(formData.get("category") ?? "기타");
  const eventDate = String(formData.get("event_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "").trim();
  const month = String(formData.get("month") ?? "");
  const base = `/work/calendar?month=${month}`;

  if (!title || !DATE_RE.test(eventDate)) {
    redirect(base + "&error=" + encodeURIComponent("제목과 날짜를 입력해주세요."));
  }
  if (endDate && (!DATE_RE.test(endDate) || endDate < eventDate)) {
    redirect(base + "&error=" + encodeURIComponent("종료일은 시작일보다 뒤여야 합니다."));
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("work_events").insert({
    teacher_id: user.id,
    title,
    category: ["연수", "출장", "회의", "평가", "기타"].includes(category)
      ? category
      : "기타",
    event_date: eventDate,
    end_date: endDate || null,
  });

  if (error) {
    redirect(base + "&error=" + encodeURIComponent("일정 등록에 실패했습니다."));
  }
  revalidatePath("/work");
  revalidatePath("/work/calendar");
  redirect(base);
}

export async function deleteWorkEvent(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const month = String(formData.get("month") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("work_events").delete().eq("id", eventId);
  revalidatePath("/work");
  revalidatePath("/work/calendar");
  redirect(`/work/calendar?month=${month}`);
}

// --- 자주 쓰는 링크 ---

export async function addLink(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 50);
  const url = String(formData.get("url") ?? "").trim();

  if (!name || !/^https?:\/\//.test(url)) {
    redirect("/work/links?error=" + encodeURIComponent("이름과 http(s):// 주소를 입력해주세요."));
  }

  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("work_links")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from("work_links").insert({
    teacher_id: user.id,
    name,
    url,
    position: count ?? 0,
  });

  if (error) {
    redirect("/work/links?error=" + encodeURIComponent("등록에 실패했습니다."));
  }
  revalidatePath("/work");
  revalidatePath("/work/links");
  redirect("/work/links");
}

export async function deleteLink(formData: FormData) {
  const linkId = String(formData.get("link_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("work_links").delete().eq("id", linkId);
  revalidatePath("/work");
  revalidatePath("/work/links");
  redirect("/work/links");
}

// --- 업무 노트 ---

// "#연구부, 생활지도" → ['연구부','생활지도'] (# 제거, 중복 제거, 최대 10개)
function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#+/, "").trim())
        .filter((t) => t.length > 0 && t.length <= 20),
    ),
  ].slice(0, 10);
}

export async function saveNote(formData: FormData) {
  const noteId = String(formData.get("note_id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const content = String(formData.get("content") ?? "").trim().slice(0, 5000);
  const tags = parseTags(String(formData.get("tags") ?? ""));

  if (!title) {
    redirect("/work/notes?error=" + encodeURIComponent("제목을 입력해주세요."));
  }

  const { supabase, user } = await requireUser();
  const { error } = noteId
    ? await supabase
        .from("work_notes")
        .update({ title, content, tags })
        .eq("id", noteId)
    : await supabase
        .from("work_notes")
        .insert({ teacher_id: user.id, title, content, tags });

  if (error) {
    redirect("/work/notes?error=" + encodeURIComponent("저장에 실패했습니다."));
  }
  revalidatePath("/work/notes");
  redirect("/work/notes");
}

export async function deleteNote(formData: FormData) {
  const noteId = String(formData.get("note_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("work_notes").delete().eq("id", noteId);
  revalidatePath("/work/notes");
  redirect("/work/notes");
}

// --- 문서 스니펫 ---

export async function addSnippet(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const content = String(formData.get("content") ?? "").trim().slice(0, 5000);

  if (!title || !content) {
    redirect("/work/snippets?error=" + encodeURIComponent("제목과 내용을 입력해주세요."));
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("work_snippets")
    .insert({ teacher_id: user.id, title, content });

  if (error) {
    redirect("/work/snippets?error=" + encodeURIComponent("저장에 실패했습니다."));
  }
  revalidatePath("/work/snippets");
  redirect("/work/snippets");
}

export async function deleteSnippet(formData: FormData) {
  const snippetId = String(formData.get("snippet_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("work_snippets").delete().eq("id", snippetId);
  revalidatePath("/work/snippets");
  redirect("/work/snippets");
}
