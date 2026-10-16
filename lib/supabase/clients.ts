import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Supabase 환경변수가 없으면 데모 모드 */
export const isSupabaseConfigured = Boolean(supabaseUrl && anonKey && serviceKey);

/** 로그인한 사용자 세션 — RLS 적용 */
export async function userClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다 — 미들웨어 없이 다음 요청에서 갱신
        }
      },
    },
  });
}

/** 서비스 롤 — 디바이스 API·시뮬레이터 전용. 클라이언트에 노출 금지 */
export function serviceClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}
