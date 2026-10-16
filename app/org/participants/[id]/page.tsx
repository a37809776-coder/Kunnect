import Link from "next/link";
import { notFound } from "next/navigation";
import PlantArt from "@/components/PlantArt";
import { BackIcon } from "@/components/Icons";
import { StatBadge, StatusChip } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { NOTICE_TEMPLATES } from "@/lib/messages/copy";
import { relativeKo } from "@/lib/time";
import NoticeSheet from "./NoticeSheet";

function Locked({ label }: { label: string }) {
  return (
    <div className="rounded-card border border-dashed border-leaf-300 px-5 py-4 text-caption text-leaf-700">
      {label} — 참여자가 공유하지 않았어요
    </div>
  );
}

export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireRole("org_staff");
  if (!me.organizationId) notFound();
  const detail = await (await getRepo()).getParticipantDetail(me.organizationId, id);
  if (!detail) notFound();
  const { row, recentCare, latest, moods } = detail;

  return (
    <>
      <header className="relative overflow-hidden rounded-bl-panel bg-leaf-500 px-5 pb-7 pt-5 text-cream">
        {row.plantArt && (row.shareCareActivity || row.shareEnvironment) && (
          <PlantArt kind={row.plantArt} size={210} className="pointer-events-none absolute -right-14 -top-4" />
        )}
        <Link href="/org" className="relative flex items-center gap-1 text-heading font-semibold">
          <BackIcon /> 현황
        </Link>
        <h1 className="relative mt-16 text-display font-extrabold">{row.displayName}</h1>
        <div className="relative mt-3 flex items-center gap-2">
          <StatusChip status={row.status} />
          {row.plantNickname && <span className="text-caption text-leaf-50/85">식물 {row.plantNickname}</span>}
        </div>
      </header>

      <section className="space-y-4 px-5 pt-6">
        {row.shareCareActivity ? (
          <div className="rounded-card bg-paper px-5 py-5">
            <h2 className="text-body font-bold text-leaf-900">돌봄 활동</h2>
            <p className="mt-1 text-caption text-leaf-700">마지막 돌봄 {relativeKo(row.lastCareAt)}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {recentCare.slice(0, 6).map((c) => (
                <li key={c.id} className="rounded-full bg-leaf-100 px-3 py-1 text-caption font-semibold text-leaf-700">
                  💧 {relativeKo(c.createdAt)}
                </li>
              ))}
              {recentCare.length === 0 && <li className="text-caption text-leaf-700">돌봄 기록이 아직 없어요</li>}
            </ul>
          </div>
        ) : (
          <Locked label="돌봄 활동" />
        )}

        {row.shareEnvironment ? (
          <div className="rounded-card bg-paper px-5 py-5">
            <h2 className="text-body font-bold text-leaf-900">재배 환경</h2>
            <p className="mt-1 text-caption text-leaf-700">디바이스 마지막 연결 {relativeKo(row.deviceLastSeenAt)}</p>
            {latest ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <StatBadge tone="onWhite" kind="moisture" value={`${latest.soilMoisture}%`} />
                <StatBadge tone="onWhite" kind="temperature" value={`${latest.temperature}℃`} />
                <StatBadge tone="onWhite" kind="light" value={`${latest.light.toLocaleString()}lx`} />
              </div>
            ) : (
              <p className="mt-3 text-caption text-leaf-700">측정값이 없어요</p>
            )}
          </div>
        ) : (
          <Locked label="재배 환경" />
        )}

        {row.shareMood ? (
          <div className="rounded-card bg-paper px-5 py-5">
            <h2 className="text-body font-bold text-leaf-900">마음 기록</h2>
            <ul className="mt-3 space-y-2">
              {moods.map((m) => (
                <li key={m.id} className="flex items-start gap-3 text-body text-leaf-900">
                  <span className="text-[22px] leading-none">{m.emoji}</span>
                  <span className="flex-1">{m.memo ?? ""}</span>
                  <span className="text-caption text-leaf-300">{relativeKo(m.createdAt)}</span>
                </li>
              ))}
              {moods.length === 0 && <li className="text-caption text-leaf-700">남긴 기록이 없어요</li>}
            </ul>
          </div>
        ) : (
          <Locked label="마음 기록" />
        )}

        {row.shareCareActivity ? (
          <NoticeSheet recipientId={row.participantId} recipientName={row.displayName} templates={NOTICE_TEMPLATES} />
        ) : (
          <p className="rounded-card bg-leaf-100 px-5 py-4 text-caption text-leaf-700">
            돌봄 활동 공유에 동의한 참여자에게만 안부를 보낼 수 있어요.
          </p>
        )}
      </section>
    </>
  );
}
