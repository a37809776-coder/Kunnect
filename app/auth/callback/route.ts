import { NextResponse } from "next/server";
import { userClient } from "@/lib/supabase/clients";

// 가입 확인 메일 링크 → 세션 교환 (이메일 확인이 켜진 프로젝트에서만 쓰인다)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) await (await userClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/", url.origin));
}
