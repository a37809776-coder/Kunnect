import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepo, isDemoMode } from "@/lib/data";
import { userClient } from "@/lib/supabase/clients";
import type { Profile, Role } from "@/lib/types";

export const DEMO_COOKIE = "pc_demo_user";

export async function currentProfile(): Promise<Profile | null> {
  const repo = await getRepo();
  if (isDemoMode) {
    const id = (await cookies()).get(DEMO_COOKIE)?.value;
    return id ? repo.getProfile(id) : null;
  }
  const { data } = await (await userClient()).auth.getUser();
  return data.user ? repo.getProfile(data.user.id) : null;
}

/** 로그인·역할 확인. 역할이 다르면 그 역할의 홈으로 보낸다 */
export async function requireRole(role: Role): Promise<Profile> {
  const me = await currentProfile();
  if (!me) redirect("/login");
  if (me.role !== role) redirect(me.role === "org_staff" ? "/org" : "/");
  return me;
}
