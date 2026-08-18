import { headers } from "next/headers";

// 인증 메일의 돌아올 주소(redirectTo)를 만들 때 쓴다.
// Vercel 프록시 뒤에서는 host 헤더가 내부 주소일 수 있어 x-forwarded-* 를 먼저 본다.
export async function getSiteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
