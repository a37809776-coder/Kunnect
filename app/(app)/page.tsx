import Link from "next/link";
import PlantArt from "@/components/PlantArt";
import PlantHero from "@/components/PlantHero";
import WaterAction from "@/components/WaterAction";
import { BigTabs, EmptyNote } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { withJosa } from "@/lib/ko";
import { relativeKo } from "@/lib/time";
import { buildPlantView, stripName } from "@/lib/view/plantView";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "status", label: "상태" },
  { key: "cheer", label: "응원" },
  { key: "org_notice", label: "기관" },
] as const;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ plant?: string; f?: string }> }) {
  const { plant: plantParam, f = "all" } = await searchParams;
  const me = await requireRole("participant");
  const repo = await getRepo();
  const plants = await repo.listPlants(me.id);
  const plant = plants.find((p) => p.id === plantParam) ?? plants[0];
  const view = await buildPlantView(repo, plant);
  if (!view) return null;

  const messages = await repo.listMessages([plant.id], { limit: 30 });
  const counts = Object.fromEntries(
    FILTERS.map((x) => [x.key, x.key === "all" ? messages.length : messages.filter((m) => m.type === x.key).length]),
  );
  const shown = (f === "all" ? messages : messages.filter((m) => m.type === f)).slice(0, 8);
  const others = plants.filter((p) => p.id !== plant.id);
  const otherSpecies = await Promise.all(others.map((p) => repo.getSpecies(p.speciesId)));
  const q = (extra: Record<string, string>) => `?${new URLSearchParams({ plant: plant.id, ...extra })}`;

  return (
    <>
      <PlantHero
        view={view}
        topRight={
          others.length > 0 && (
            <div className="flex gap-2">
              {others.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/?plant=${p.id}`}
                  aria-label={`${p.nickname} 보기`}
                  className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-leaf-50/25 backdrop-blur"
                >
                  <PlantArt kind={otherSpecies[i]?.art ?? "leafy"} size={40} />
                </Link>
              ))}
            </div>
          )
        }
      />

      <section className="px-5">
        <BigTabs
          active={f}
          tabs={FILTERS.map((x) => ({ key: x.key, label: x.label, count: counts[x.key], href: q({ f: x.key }) }))}
        />

        <div className="relative mt-6 flex items-center gap-4 rounded-card bg-leaf-500 py-5 pl-24 pr-4 text-cream shadow-float">
          <PlantArt kind={view.species.art} size={96} thirsty={view.thirsty} className="absolute -left-5 top-1/2 -translate-y-1/2" />
          <div className="flex-1">
            <p className="text-heading font-bold">오늘의 돌봄</p>
            <p className="mt-1 text-caption text-leaf-50/80">
              {view.latest ? `${relativeKo(view.latest.measuredAt)} 측정` : "측정값을 기다리는 중"}
            </p>
          </div>
          <WaterAction plantId={plant.id} plantName={plant.nickname} />
        </div>

        <h2 className="mt-8 text-heading font-bold text-leaf-900">{withJosa(plant.nickname, "이", "가")} 보낸 이야기</h2>
        <ul className="mt-3 space-y-3">
          {shown.length === 0 && <EmptyNote>아직 이 종류의 메시지가 없어요</EmptyNote>}
          {shown.map((m) => (
            <li
              key={m.id}
              className={`rounded-card px-5 py-4 ${
                m.type === "org_notice" ? "bg-cream-soft text-leaf-900" : "bg-paper text-leaf-900 shadow-[0_6px_20px_-14px_rgb(31_51_32/0.5)]"
              }`}
            >
              <div className="flex items-center justify-between text-caption font-semibold text-leaf-700">
                <span>{m.type === "org_notice" ? "그린테라피에서 온 안부" : m.type === "cheer" ? "응원" : "상태"}</span>
                <span className="flex items-center gap-2">
                  {!m.isRead && <span className="h-2 w-2 rounded-full bg-amber" aria-label="안 읽음" />}
                  {relativeKo(m.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-body">{stripName(m.body, plant.nickname)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
