import Link from "next/link";
import PlantArt from "@/components/PlantArt";
import { ChevronIcon } from "@/components/Icons";
import { BigTabs, EmptyNote, StatusChip } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { relativeKo } from "@/lib/time";
import type { ParticipantStatus } from "@/lib/types";

const FILTERS: { key: "all" | ParticipantStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "yellow", label: "관심" },
  { key: "red", label: "연락" },
  { key: "green", label: "지속" },
  { key: "none", label: "비공유" },
];
// 살펴볼 순서: 연락 권장 → 관심 필요 → 지속 → 공유 안 함
const ORDER: Record<ParticipantStatus, number> = { red: 0, yellow: 1, green: 2, none: 3 };

export default async function OrgHomePage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const f = (await searchParams).f ?? "all";
  const me = await requireRole("org_staff");
  const repo = await getRepo();
  const org = me.organizationId ? await repo.getOrganization(me.organizationId) : null;
  const rows = org ? await repo.listParticipantRows(org.id, new Date()) : [];
  const counts = Object.fromEntries(FILTERS.map((x) => [x.key, x.key === "all" ? rows.length : rows.filter((r) => r.status === x.key).length]));
  const shown = (f === "all" ? rows : rows.filter((r) => r.status === f)).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const needAttention = rows.filter((r) => r.status === "red" || r.status === "yellow").length;

  return (
    <>
      <header className="relative overflow-hidden rounded-bl-panel bg-leaf-500 px-5 pb-8 pt-5">
        <PlantArt kind="succulent" size={220} className="pointer-events-none absolute -right-16 -top-10" />
        <p className="relative text-heading font-bold text-cream/90">사후관리</p>
        <h1 className="relative mt-20 text-title font-extrabold text-cream">{org?.name ?? "기관"}</h1>
        <p className="relative mt-1 text-display font-extrabold text-cream">
          {needAttention}명<span className="ml-2 text-heading font-bold text-leaf-50/85">살펴볼 참여자</span>
        </p>
      </header>

      <section className="px-5">
        <BigTabs active={f} tabs={FILTERS.map((x) => ({ key: x.key, label: x.label, count: counts[x.key], href: `/org?f=${x.key}` }))} />
        <ul className="mt-6 space-y-4">
          {shown.length === 0 && <EmptyNote>해당하는 참여자가 없어요</EmptyNote>}
          {shown.map((r) => (
            <li key={r.participantId}>
              <Link
                href={`/org/participants/${r.participantId}`}
                className={`relative flex items-center gap-3 rounded-card py-4 pl-24 pr-4 shadow-float ${
                  r.status === "none" ? "bg-leaf-100 text-leaf-700" : "bg-leaf-500 text-cream"
                }`}
              >
                <span className="absolute -left-3 top-1/2 -translate-y-1/2">
                  {r.plantArt ? <PlantArt kind={r.plantArt} size={92} /> : <span className="block h-[92px] w-[92px]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-heading font-bold">{r.displayName}</span>
                  <span className="mt-1 block">
                    <StatusChip status={r.status} />
                  </span>
                  <span className={`mt-1.5 block text-caption ${r.status === "none" ? "text-leaf-700" : "text-leaf-50/85"}`}>
                    {r.shareCareActivity ? `마지막 돌봄 ${relativeKo(r.lastCareAt)}` : "공유한 정보가 없어요"}
                    {r.plantNickname ? ` · ${r.plantNickname}` : ""}
                  </span>
                </span>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-button bg-paper text-leaf-700">
                  <ChevronIcon />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-caption text-leaf-700">
          상태는 식물·돌봄 활동만으로 판단해요. 참여자의 마음 상태를 추정하지 않아요.
        </p>
      </section>
    </>
  );
}
