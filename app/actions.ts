"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_COOKIE, requireRole } from "@/lib/auth";
import { getRepo, isDemoMode, simulatorEnabled } from "@/lib/data";
import { DEMO_ACCOUNTS } from "@/lib/data/demo";
import { processReading } from "@/lib/device/processReading";
import { FORBIDDEN_WORDS } from "@/lib/messages/copy";
import { userClient } from "@/lib/supabase/clients";
import { MOOD_EMOJIS } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

// ---------- 로그인 ----------

export async function demoLogin(formData: FormData) {
  if (!isDemoMode) throw new Error("demo only");
  const id = String(formData.get("userId"));
  if (!DEMO_ACCOUNTS.some((a) => a.id === id)) throw new Error("unknown account");
  (await cookies()).set(DEMO_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(id === "u-staff" ? "/org" : "/");
}

export async function emailLogin(_: unknown, formData: FormData): Promise<ActionResult> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { ok: false, error: "이메일 주소를 확인해 주세요" };
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await (await userClient()).auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  return error ? { ok: false, error: "메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요" } : { ok: true };
}

export async function logout() {
  if (isDemoMode) (await cookies()).delete(DEMO_COOKIE);
  else await (await userClient()).auth.signOut();
  redirect("/login");
}

// ---------- 온보딩 ----------

const onboardingSchema = z.object({
  inviteCode: z.string().trim().min(1, "초대코드를 입력해 주세요"),
  serial: z.string().trim().min(1, "디바이스 번호를 입력해 주세요"),
  pairingCode: z.string().trim().min(1, "페어링 코드를 입력해 주세요"),
  speciesId: z.string().min(1, "식물 종류를 골라 주세요"),
  nickname: z.string().trim().min(1, "식물 이름을 지어 주세요").max(12, "이름은 12자까지예요"),
  shareCare: z.boolean(),
  shareEnvironment: z.boolean(),
  shareMood: z.boolean(),
});

const ERROR_KO: Record<string, string> = {
  invalid_invite_code: "초대코드를 다시 확인해 주세요",
  device_not_found: "디바이스 번호를 찾을 수 없어요",
  invalid_pairing_code: "페어링 코드가 맞지 않아요",
  device_taken: "이미 다른 분이 연결한 디바이스예요",
};

export async function completeOnboarding(_: unknown, formData: FormData): Promise<ActionResult> {
  const me = await requireRole("participant");
  const parsed = onboardingSchema.safeParse({
    inviteCode: formData.get("inviteCode"),
    serial: formData.get("serial"),
    pairingCode: formData.get("pairingCode"),
    speciesId: formData.get("speciesId"),
    nickname: formData.get("nickname"),
    shareCare: formData.get("shareCare") === "on",
    shareEnvironment: formData.get("shareEnvironment") === "on",
    shareMood: formData.get("shareMood") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const repo = await getRepo();
  try {
    const org = await repo.joinOrganization(me.id, v.inviteCode);
    const device = await repo.pairDevice(me.id, v.serial, v.pairingCode);
    await repo.createPlant({ ownerId: me.id, deviceId: device.id, speciesId: v.speciesId, nickname: v.nickname });
    const any = v.shareCare || v.shareEnvironment || v.shareMood;
    await repo.saveConsent({
      userId: me.id,
      organizationId: org.id,
      shareCareActivity: v.shareCare,
      shareEnvironment: v.shareEnvironment,
      shareMood: v.shareMood,
      agreedAt: any ? new Date().toISOString() : null,
      revokedAt: null,
    });
  } catch (e) {
    const key = e instanceof Error ? Object.keys(ERROR_KO).find((k) => e.message.includes(k)) : undefined;
    return { ok: false, error: key ? ERROR_KO[key] : "설정을 마치지 못했어요. 다시 시도해 주세요" };
  }
  redirect("/");
}

// ---------- 돌봄 · 마음 ----------

async function ownPlant(plantId: string) {
  const me = await requireRole("participant");
  const repo = await getRepo();
  const plant = await repo.getPlant(plantId);
  if (!plant || plant.ownerId !== me.id) throw new Error("not_allowed");
  return { me, repo, plant };
}

/** [물 줬어요] — 1분 내 연타는 1건으로 (엣지 케이스) */
export async function recordWater(plantId: string): Promise<ActionResult<{ careEventId: string; duplicate: boolean }>> {
  const { me, repo, plant } = await ownPlant(plantId);
  const since = new Date(Date.now() - 60_000);
  const [dup] = await repo.listCareEvents(plant.id, since);
  if (dup && dup.type === "water") return { ok: true, data: { careEventId: dup.id, duplicate: true } };
  const ev = await repo.insertCareEvent({ plantId: plant.id, userId: me.id, type: "water" });
  revalidatePath("/");
  return { ok: true, data: { careEventId: ev.id, duplicate: false } };
}

export async function saveMood(input: { careEventId: string | null; emoji: string; memo: string }): Promise<ActionResult> {
  const me = await requireRole("participant");
  const emoji = MOOD_EMOJIS.find((e) => e === input.emoji);
  if (!emoji) return { ok: false, error: "이모지를 골라 주세요" };
  const memo = input.memo.trim().slice(0, 100) || null;
  await (await getRepo()).insertMood({ userId: me.id, careEventId: input.careEventId, emoji, memo });
  return { ok: true };
}

export async function markAllRead(plantIds: string[]) {
  const me = await requireRole("participant");
  const repo = await getRepo();
  const mine = (await repo.listPlants(me.id)).map((p) => p.id).filter((id) => plantIds.includes(id));
  const unread = (await repo.listMessages(mine)).filter((m) => !m.isRead).map((m) => m.id);
  await repo.markMessagesRead(unread);
}

// ---------- 공유 설정 ----------

export async function updateSharing(input: {
  shareCare: boolean;
  shareEnvironment: boolean;
  shareMood: boolean;
}): Promise<ActionResult> {
  const me = await requireRole("participant");
  if (!me.organizationId) return { ok: false, error: "연결된 기관이 없어요" };
  const repo = await getRepo();
  const prev = await repo.getConsent(me.id, me.organizationId);
  const any = input.shareCare || input.shareEnvironment || input.shareMood;
  const now = new Date().toISOString();
  await repo.saveConsent({
    userId: me.id,
    organizationId: me.organizationId,
    shareCareActivity: input.shareCare,
    shareEnvironment: input.shareEnvironment,
    shareMood: input.shareMood,
    agreedAt: any ? (prev?.agreedAt && !prev.revokedAt ? prev.agreedAt : now) : prev?.agreedAt ?? null,
    revokedAt: any ? null : prev?.agreedAt ? now : null,
  });
  revalidatePath("/settings/sharing");
  return { ok: true };
}

// ---------- 기관 ----------

export async function sendNotice(recipientId: string, body: string): Promise<ActionResult> {
  const me = await requireRole("org_staff");
  const text = body.trim();
  if (!text) return { ok: false, error: "안내 내용을 입력해 주세요" };
  if (text.length > 300) return { ok: false, error: "300자까지 보낼 수 있어요" };
  if (FORBIDDEN_WORDS.some((w) => text.includes(w)))
    return { ok: false, error: "진단·치료처럼 들리는 표현은 쓰지 않아요 (비임상 원칙)" };
  try {
    await (await getRepo()).sendOrgNotice(me.id, recipientId, text);
  } catch {
    return { ok: false, error: "이 참여자는 안내 받기에 동의하지 않았어요" };
  }
  revalidatePath(`/org/participants/${recipientId}`);
  return { ok: true };
}

// ---------- 하드웨어 시뮬레이터 ----------

const simSchema = z.object({
  plantId: z.string().min(1),
  soilMoisture: z.number().int().min(0).max(100),
  temperature: z.number().min(-10).max(60),
  light: z.number().int().min(0).max(100000),
  battery: z.number().int().min(0).max(100),
  at: z.enum(["now", "noon", "night"]),
  resetCooldown: z.boolean(),
});

export async function simulateReading(
  input: z.infer<typeof simSchema>,
): Promise<ActionResult<{ codes: string[]; bodies: string[] }>> {
  if (!simulatorEnabled) return { ok: false, error: "시뮬레이터가 꺼져 있어요" };
  const parsed = simSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "값을 확인해 주세요" };
  const v = parsed.data;
  const { repo, plant } = await ownPlant(v.plantId).catch(() => ({ repo: null, plant: null }));
  if (!repo || !plant) return { ok: false, error: "내 식물이 아니에요" };
  const device = await repo.ensureVirtualDevice(plant);
  // 측정 시각은 항상 '지금'(최신 측정값 유지), 낮/밤 판정만 바꾼다
  const res = await processReading(
    repo,
    { serial: device.serial, soil_moisture: v.soilMoisture, temperature: v.temperature, light: v.light, battery: v.battery },
    {
      trustedVirtual: true,
      ignoreCooldown: v.resetCooldown,
      daytimeOverride: v.at === "noon" ? true : v.at === "night" ? false : undefined,
    },
  );
  if (res.status !== 200) return { ok: false, error: `처리 실패 (${res.status})` };
  revalidatePath("/");
  revalidatePath("/simulator");
  return { ok: true, data: { codes: res.messages.map((m) => m.code), bodies: res.messages.map((m) => m.body) } };
}
