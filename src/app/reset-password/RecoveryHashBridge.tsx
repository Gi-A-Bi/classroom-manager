"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// 일부 Supabase 설정에서는 재설정 토큰이 URL 조각(#access_token=...)으로 온다.
// 조각은 서버로 전송되지 않으므로 브라우저에서 세션으로 바꿔준 뒤 화면을 새로 그린다.
export function RecoveryHashBridge() {
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const bridge = async () => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) return false;

      const { error } = await createClient().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return false;

      // 토큰이 주소창에 남지 않도록 지운다.
      window.history.replaceState(null, "", window.location.pathname);
      router.refresh();
      return true;
    };

    bridge().then((recovered) => {
      if (!recovered) setExpired(true);
    });
  }, [router]);

  if (!expired) {
    return (
      <p className="rounded-xl border border-line bg-paper p-6 text-center text-ink-soft">
        링크를 확인하는 중이에요…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-6 text-center">
      <p className="text-ink-soft">
        링크가 만료되었거나 이미 사용된 링크예요.
        <br />
        재설정 메일을 다시 요청해주세요.
      </p>
      <Link
        href="/forgot-password"
        className="rounded-lg bg-ink p-2.5 font-medium text-paper transition-colors hover:bg-ink/85"
      >
        재설정 메일 다시 받기
      </Link>
    </div>
  );
}
