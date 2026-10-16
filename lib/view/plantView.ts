import "server-only";
import type { Repo } from "@/lib/data/repo";
import { metricLevels, type MetricLevel } from "@/lib/messages/engine";
import { disconnectedCopy, idleCopy, waitingCopy } from "@/lib/messages/copy";
import { hours } from "@/lib/time";
import type { Plant, PlantMessage, Reading, Species } from "@/lib/types";

export interface PlantView {
  plant: Plant;
  species: Species;
  latest: Reading | null;
  levels: { moisture: MetricLevel; temperature: MetricLevel; light: MetricLevel };
  /** 말풍선 문구 — 식물 이름 접두어는 떼고 보여준다 */
  bubble: string;
  bubbleAt: string | null;
  disconnected: boolean;
  thirsty: boolean;
}

const OK = { moisture: "ok", temperature: "ok", light: "ok" } as const;

export function stripName(body: string, name: string) {
  return body.startsWith(`${name}: `) ? body.slice(name.length + 2) : body;
}

export async function buildPlantView(repo: Repo, plant: Plant, now = new Date()): Promise<PlantView | null> {
  const species = await repo.getSpecies(plant.speciesId);
  if (!species) return null;
  const [latest, recent] = await Promise.all([repo.latestReading(plant.id), repo.listMessages([plant.id], { limit: 1 })]);
  const levels = latest ? metricLevels({ ...latest, measuredAt: new Date(latest.measuredAt) }, species) : OK;
  // F3-03: 마지막 측정이 3시간 이상 전이면 연결 끊김 안내
  const disconnected = !!latest && now.getTime() - new Date(latest.measuredAt).getTime() > hours(3);
  const lastMsg: PlantMessage | undefined = recent[0];
  const bubble = !latest
    ? waitingCopy
    : disconnected
      ? disconnectedCopy
      : lastMsg
        ? stripName(lastMsg.body, plant.nickname)
        : stripName(idleCopy(plant.nickname), plant.nickname);
  return {
    plant,
    species,
    latest,
    levels,
    bubble,
    bubbleAt: lastMsg?.createdAt ?? null,
    disconnected,
    thirsty: levels.moisture === "low",
  };
}
