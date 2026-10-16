import "server-only";
import type { Repo } from "./repo";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabase";
import { isSupabaseConfigured, serviceClient, userClient } from "@/lib/supabase/clients";

export const isDemoMode = !isSupabaseConfigured;

/** 요청 단위 저장소 — Supabase면 로그인 세션(RLS) 기준 */
export async function getRepo(): Promise<Repo> {
  if (isDemoMode) return demoRepo;
  return supabaseRepo(await userClient(), serviceClient());
}

/** 디바이스 API 전용 — 세션 없이 서비스 롤로 동작 */
export function getDeviceRepo(): Repo {
  if (isDemoMode) return demoRepo;
  const svc = serviceClient();
  return supabaseRepo(svc, svc);
}

export const simulatorEnabled = isDemoMode || process.env.NEXT_PUBLIC_ENABLE_SIMULATOR === "true";
