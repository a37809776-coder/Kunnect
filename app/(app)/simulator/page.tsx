import Link from "next/link";
import { notFound } from "next/navigation";
import PlantArt from "@/components/PlantArt";
import PlantHero from "@/components/PlantHero";
import { SimRibbon } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getRepo, simulatorEnabled } from "@/lib/data";
import { buildPlantView } from "@/lib/view/plantView";
import SimulatorPanel from "./SimulatorPanel";

/** 하드웨어 시뮬레이터 (design.md §7.4, ADR-004) */
export default async function SimulatorPage({ searchParams }: { searchParams: Promise<{ plant?: string }> }) {
  if (!simulatorEnabled) notFound();
  const { plant: plantParam } = await searchParams;
  const me = await requireRole("participant");
  const repo = await getRepo();
  const plants = await repo.listPlants(me.id);
  const plant = plants.find((p) => p.id === plantParam) ?? plants[0];
  const view = await buildPlantView(repo, plant);
  if (!view) notFound();
  const device = plant.deviceId ? await repo.getDevice(plant.deviceId) : null;
  const allSpecies = await Promise.all(plants.map((p) => repo.getSpecies(p.speciesId)));
  const latest = view.latest;

  return (
    <>
      <SimRibbon />
      <PlantHero view={view} title="미리보기" compact />

      <section className="px-5 pt-5">
        {plants.length > 1 && (
          <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5" aria-label="대상 식물">
            {plants.map((p, i) => {
              const on = p.id === plant.id;
              return (
                <Link
                  key={p.id}
                  href={`/simulator?plant=${p.id}`}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-body font-bold ${
                    on ? "bg-leaf-500 text-cream" : "bg-paper text-leaf-700"
                  }`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf-500">
                    <PlantArt kind={allSpecies[i]?.art ?? "leafy"} size={34} />
                  </span>
                  {p.nickname}
                </Link>
              );
            })}
          </div>
        )}

        <SimulatorPanel
          key={plant.id}
          plantId={plant.id}
          plantName={plant.nickname}
          deviceLabel={device?.isVirtual ? `가상 디바이스 ${device.serial}` : "첫 전송 때 가상 디바이스가 연결돼요"}
          ranges={{
            moisture: [view.species.moistureMin, view.species.moistureMax],
            temperature: [view.species.tempMin, view.species.tempMax],
            light: [view.species.lightMin, view.species.lightMax],
          }}
          initial={{
            soilMoisture: latest?.soilMoisture ?? 50,
            temperature: latest?.temperature ?? 22,
            light: latest?.light ?? 3000,
            battery: device?.batteryLevel ?? 80,
          }}
        />
      </section>
    </>
  );
}
