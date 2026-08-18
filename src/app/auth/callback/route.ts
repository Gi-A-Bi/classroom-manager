import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

// 메일로 보낸 인증 링크(비밀번호 재설정·가입 확인)가 돌아오는 자리.
// PKCE(?code=)와 token_hash(?token_hash=&type=) 두 형태를 모두 받는다.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = await getSiteOrigin();

  const rawNext = searchParams.get("next") ?? "/dashboard";
  // 외부 사이트로 튕기지 않도록 내부 경로만 허용한다.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const fail = (message: string) =>
    NextResponse.redirect(
      `${origin}/forgot-password?error=${encodeURIComponent(message)}`,
    );

  // Supabase가 링크 자체를 거부한 경우(만료·재사용)
  if (searchParams.get("error") || searchParams.get("error_description")) {
    return fail("링크가 만료되었거나 이미 사용된 링크예요. 다시 요청해주세요.");
  }

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return fail(
        "링크 확인에 실패했어요. 메일을 요청한 것과 같은 기기·브라우저에서 열어야 해요.",
      );
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return fail("링크가 만료되었거나 이미 사용된 링크예요. 다시 요청해주세요.");
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // 토큰이 URL 조각(#)에 담겨 오는 옛 방식은 서버에서 볼 수 없다.
  // 재설정 화면이 브라우저에서 직접 처리하도록 넘긴다.
  return NextResponse.redirect(`${origin}${next}`);
}
