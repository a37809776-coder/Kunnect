import Link from "next/link";
import { notFound } from "next/navigation";
import PlantArt from "@/components/PlantArt";
import ReadingsChart from "@/components/ReadingsChart";
import { BackIcon } from "@/components/Icons";
import { SpeechBubble, StatBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { days, hours } from "@/lib/time";
import { buildPlantView } from "@/lib/view/plantView";

/** 레퍼런스 오른쪽 화면 — 왼쪽 흰 레일(내 식물) + 큰 식물 + 크림 이름 + 배지 + 돌봄 가이드 */
export default async function PlantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const range = (await searchParams).range === "7d" ? "7d" : "24h";
  const me = await requireRole("participant");
  const repo = await getRepo();
  const plants = await repo.listPlants(me.id);
  const plant = plants.find((p) => p.id === id);
  if (!plant) notFound();
  const view = await buildPlantView(repo, plant);
  if (!view) notFound();
  const { species, latest, levels } = view;

  const since = new Date(Date.now() - (range === "7d" ? days(7) : hours(24)));
  const readings = await repo.listReadings(plant.id, since);
  // 7일 보기는 3시간 단위로 솎아 그래프를 가볍게
  const step = range === "7d" ? 3 : 1;
  const points = readings
    .filter((_, i) => i % step === 0 || i === readings.length - 1)
    .map((r) => ({ t: r.measuredAt, moisture: r.soilMoisture, temperature: r.temperature, light: r.light }));
  const allSpecies = await Promise.all(plants.map((p) => repo.getSpecies(p.speciesId)));

  return (
    <div className="bg-leaf-500">
      <header className="flex items-center justify-between px-5 pt-5 text-cream">
        <Link href={`/?plant=${plant.id}`} className="flex items-center gap-1 text-heading font-semibold">
          <BackIcon /> 홈
        </Link>
      </header>

      <div className="relative mt-4 flex min-h-[460px]">
        <aside className="z-10 flex w-24 shrink-0 flex-col gap-3 rounded-r-panel bg-paper py-5" aria-label="내 식물">
          {plants.map((p, i) => {
            const on = p.id === plant.id;
            return (
              <Link
                key={p.id}
                href={`/plant/${p.id}?range=${range}`}
                aria-current={on ? "page" : undefined}
                className={`mx-auto grid h-20 w-20 place-items-center rounded-card transition ${on ? "bg-leaf-500" : "bg-paper"}`}
              >
                <PlantArt kind={allSpecies[i]?.art ?? "leafy"} size={62} label={p.nickname} />
              </Link>
            );
          })}
        </aside>

        <section className="relative flex-1 overflow-hidden pb-8 pl-5 pr-5 text-cream">
          <PlantArt kind={species.art} size={240} thirsty={view.thirsty} className="pointer-events-none absolute -right-20 -top-4" />
          <div className="relative pt-48">
            <p className="text-caption font-semibold text-leaf-50/75">{species.name}</p>
            <h1 className="text-title font-extrabold text-cream">{plant.nickname}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatBadge kind="moisture" value={latest ? `${latest.soilMoisture}%` : "–"} level={levels.moisture} />
              <StatBadge kind="temperature" value={latest ? `${latest.temperature}℃` : "–"} level={levels.temperature} />
              <StatBadge kind="light" value={latest ? `${latest.light.toLocaleString()}lx` : "–"} level={levels.light} />
            </div>
            <p className="mt-4 text-body text-leaf-50/90">{species.careGuide}</p>
            <SpeechBubble className="mt-4">{view.bubble}</SpeechBubble>
          </div>
        </section>
      </div>

      <section className="rounded-t-panel bg-paper px-5 pb-6 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-heading font-bold text-leaf-900">환경 기록</h2>
          <div className="flex rounded-full bg-leaf-100 p-1 text-caption font-bold" role="tablist">
            {(["24h", "7d"] as const).map((r) => (
              <Link
                key={r}
                href={`?range=${r}`}
                scroll={false}
                role="tab"
                aria-selected={range === r}
                className={`rounded-full px-3 py-1.5 ${range === r ? "bg-paper text-leaf-900 shadow" : "text-leaf-700"}`}
              >
                {r === "24h" ? "24시간" : "7일"}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <ReadingsChart
            points={points}
            range={range}
            ranges={{
              moisture: [species.moistureMin, species.moistureMax],
              temperature: [species.tempMin, species.tempMax],
              light: [species.lightMin, species.lightMax],
            }}
          />
        </div>
      </section>
    </div>
  );
}
