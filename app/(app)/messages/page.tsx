import PlantArt from "@/components/PlantArt";
import { EmptyNote } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { relativeKo } from "@/lib/time";
import { stripName } from "@/lib/view/plantView";
import MarkRead from "./MarkRead";

export default async function MessagesPage() {
  const me = await requireRole("participant");
  const repo = await getRepo();
  const plants = await repo.listPlants(me.id);
  const species = await Promise.all(plants.map((p) => repo.getSpecies(p.speciesId)));
  const messages = await repo.listMessages(
    plants.map((p) => p.id),
    { limit: 40 },
  );
  const byId = new Map(plants.map((p, i) => [p.id, { plant: p, art: species[i]?.art ?? "leafy" }]));
  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <>
      <header className="rounded-bl-panel bg-leaf-500 px-5 pb-8 pt-5">
        <p className="text-heading font-bold text-cream/90">플랜트커넥트</p>
        <h1 className="mt-10 text-display font-extrabold text-cream">메시지</h1>
        <p className="mt-2 text-body text-leaf-50/85">
          {unread > 0 ? `새 이야기 ${unread}개가 도착했어요` : "식물들이 보낸 이야기를 모두 읽었어요"}
        </p>
      </header>
      <MarkRead plantIds={plants.map((p) => p.id)} hasUnread={unread > 0} />
      <ul className="space-y-3 px-5 pt-6">
        {messages.length === 0 && <EmptyNote>아직 받은 메시지가 없어요</EmptyNote>}
        {messages.map((m) => {
          const info = byId.get(m.plantId)!;
          const notice = m.type === "org_notice";
          return (
            <li
              key={m.id}
              className={`relative flex gap-3 rounded-card px-4 py-4 ${notice ? "bg-cream-soft" : "bg-paper shadow-[0_6px_20px_-14px_rgb(31_51_32/0.5)]"}`}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-leaf-500">
                <PlantArt kind={info.art} size={44} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-caption font-semibold text-leaf-700">
                  <span>{notice ? `그린테라피 → ${info.plant.nickname}` : info.plant.nickname}</span>
                  <span className="flex items-center gap-2">
                    {!m.isRead && <span className="h-2 w-2 rounded-full bg-amber" aria-label="안 읽음" />}
                    {relativeKo(m.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-body text-leaf-900">{stripName(m.body, info.plant.nickname)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
