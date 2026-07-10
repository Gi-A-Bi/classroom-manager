import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { createClient } from "@/lib/supabase/server";
import { getTheme, THEME_KEYS, THEMES } from "@/lib/themes";
import {
  addTool,
  deleteTool,
  moveTool,
  toggleFavorite,
  toggleVisible,
  updateTool,
} from "./actions";

export default async function ToolsDrawerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { error, edit } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: tools }] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, theme_color")
      .eq("id", id)
      .single(),
    supabase
      .from("class_tools")
      .select("id, name, url, description, color, is_student_visible, is_favorite")
      .order("position"),
  ]);

  if (!classroom) notFound();

  const list = tools ?? [];
  const editing = edit ? list.find((t) => t.id === edit) : null;
  const favCount = list.filter((t) => t.is_favorite).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="tools" />

      <ClassroomHeader
        name={classroom.name}
        title="도구"
        themeColor={classroom.theme_color}
      />
      <p className="-mt-3 text-sm text-gray-500">
        자주 쓰는 외부 프로그램(자리바꾸기·타이머·퀴즈 등) 링크를 카드로 모아두는
        서랍이에요. 카드는 모든 학급에서 함께 쓰여요.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 등록/수정 폼 */}
      <section className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">
          {editing ? "✏️ 카드 수정" : "➕ 링크 카드 추가"}
        </h2>
        <form action={editing ? updateTool : addTool} className="flex flex-col gap-3">
          <input type="hidden" name="classroom_id" value={classroom.id} />
          {editing && <input type="hidden" name="tool_id" value={editing.id} />}
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              이름
              <input
                type="text"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                placeholder="자리바꾸기"
                className="w-40 rounded-lg border p-2"
              />
            </label>
            <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
              주소(URL)
              <input
                type="url"
                name="url"
                required
                defaultValue={editing?.url ?? ""}
                placeholder="https://..."
                className="rounded-lg border p-2"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            설명 <span className="text-xs text-gray-400">(선택)</span>
            <input
              type="text"
              name="description"
              defaultValue={editing?.description ?? ""}
              placeholder="제비뽑기로 자리 정하기"
              className="rounded-lg border p-2"
            />
          </label>
          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1">아이콘 색</legend>
            <div className="flex flex-wrap gap-2">
              {THEME_KEYS.map((key, i) => (
                <label key={key} className="cursor-pointer" title={THEMES[key].label}>
                  <input
                    type="radio"
                    name="color"
                    value={key}
                    defaultChecked={
                      editing ? editing.color === key : i === 0
                    }
                    className="peer sr-only"
                  />
                  <span
                    className={`block h-8 w-8 rounded-full ${THEMES[key].swatch} ring-offset-2 transition-transform hover:scale-110 peer-checked:ring-2 peer-checked:ring-gray-800`}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {editing ? "수정 저장" : "추가"}
            </button>
            {editing && (
              <a
                href={`/dashboard/classrooms/${classroom.id}/tools`}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                취소
              </a>
            )}
          </div>
        </form>
      </section>

      {/* 카드 목록 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-wide text-gray-400">
          등록된 도구 {list.length}개
          {favCount > 0 && ` · 즐겨찾기 ${favCount}`}
        </h2>
        {list.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {list.map((tool, i) => {
              const theme = getTheme(tool.color);
              return (
                <li
                  key={tool.id}
                  className="flex flex-col gap-2 rounded-xl border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${theme.soft} ${theme.text}`}
                      >
                        🔗
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold hover:underline">
                          {tool.name} ↗
                        </span>
                        {tool.description && (
                          <span className="block text-sm text-gray-500">
                            {tool.description}
                          </span>
                        )}
                        <span className="block truncate text-xs text-gray-400">
                          {tool.url}
                        </span>
                      </span>
                    </a>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex gap-0.5">
                        <form action={moveTool}>
                          <input type="hidden" name="classroom_id" value={classroom.id} />
                          <input type="hidden" name="tool_id" value={tool.id} />
                          <input type="hidden" name="dir" value="up" />
                          <button
                            type="submit"
                            disabled={i === 0}
                            title="위로"
                            className="rounded-md px-1.5 py-1 text-gray-400 transition-colors hover:bg-gray-50 disabled:opacity-30"
                          >
                            ↑
                          </button>
                        </form>
                        <form action={moveTool}>
                          <input type="hidden" name="classroom_id" value={classroom.id} />
                          <input type="hidden" name="tool_id" value={tool.id} />
                          <input type="hidden" name="dir" value="down" />
                          <button
                            type="submit"
                            disabled={i === list.length - 1}
                            title="아래로"
                            className="rounded-md px-1.5 py-1 text-gray-400 transition-colors hover:bg-gray-50 disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </form>
                        <a
                          href={`/dashboard/classrooms/${classroom.id}/tools?edit=${tool.id}`}
                          title="수정"
                          className="rounded-md px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-50"
                        >
                          수정
                        </a>
                        <form action={deleteTool}>
                          <input type="hidden" name="classroom_id" value={classroom.id} />
                          <input type="hidden" name="tool_id" value={tool.id} />
                          <button
                            type="submit"
                            title="삭제"
                            className="rounded-md px-2 py-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t pt-2">
                    <form action={toggleVisible}>
                      <input type="hidden" name="classroom_id" value={classroom.id} />
                      <input type="hidden" name="tool_id" value={tool.id} />
                      <input type="hidden" name="value" value={tool.is_student_visible ? "0" : "1"} />
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          tool.is_student_visible
                            ? "bg-green-100 text-green-700"
                            : "border bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {tool.is_student_visible ? "✓ 학생에게 보임" : "학생에게 보이기"}
                      </button>
                    </form>
                    <form action={toggleFavorite}>
                      <input type="hidden" name="classroom_id" value={classroom.id} />
                      <input type="hidden" name="tool_id" value={tool.id} />
                      <input type="hidden" name="value" value={tool.is_favorite ? "0" : "1"} />
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          tool.is_favorite
                            ? "bg-amber-100 text-amber-700"
                            : "border bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {tool.is_favorite ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-gray-400">
            🧰 첫 링크 카드를 추가해보세요.
          </p>
        )}
        <p className="text-xs text-gray-400">
          즐겨찾기한 카드는 대시보드 투데이 뷰에 바로가기로 나와요(최대 2개).
          학생에게 보이기를 켜면 학생 홈에 버튼이 생겨요.
        </p>
      </section>
    </main>
  );
}
