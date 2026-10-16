import { NextResponse } from "next/server";
import { userClient } from "@/lib/supabase/clients";

// 매직링크 → 세션 교환
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) await (await userClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/", url.origin));
}
