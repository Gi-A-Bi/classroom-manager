import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { createClient } from "@/lib/supabase/server";
import { TOOLS } from "@/lib/tools/registry";

export default async function ToolsDrawerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, theme_color")
    .eq("id", id)
    .single();
  if (!classroom) notFound();

  // 각 도구의 결과 유무·공개 상태 표시
  const { data: results } = await supabase
    .from("tool_results")
    .select("tool_key, is_public")
    .eq("classroom_id", id);
  const stateOf = new Map((results ?? []).map((r) => [r.tool_key, r.is_public]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="tools" />

      <ClassroomHeader
        name={classroom.name}
        title="도구"
        themeColor={classroom.theme_color}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const hasResult = stateOf.has(tool.key);
          const isPublic = stateOf.get(tool.key) === true;
          return (
            <Link
              key={tool.key}
              href={`/dashboard/classrooms/${classroom.id}/tools/${tool.key}`}
              className="flex flex-col gap-2 rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-xl px-2.5 py-1 text-lg ${tool.pill}`}>
                  {tool.emoji}
                </span>
                <span className="text-lg font-bold">{tool.name}</span>
                {hasResult && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                      isPublic
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isPublic ? "학생 공개 중" : "결과 있음 · 비공개"}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{tool.description}</p>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        도구는 계속 추가될 예정이에요. (예정: 마니또, 뽑기, 1인 1역)
      </p>
    </main>
  );
}
