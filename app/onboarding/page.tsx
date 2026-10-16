import { redirect } from "next/navigation";
import PlantArt from "@/components/PlantArt";
import { requireRole } from "@/lib/auth";
import { getRepo, isDemoMode } from "@/lib/data";
import { DEMO_PAIRING_CODE } from "@/lib/data/demo";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const me = await requireRole("participant");
  const repo = await getRepo();
  if ((await repo.listPlants(me.id)).length > 0) redirect("/");
  const species = await repo.listSpecies();

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-leaf-500">
      <section className="relative overflow-hidden px-6 pb-8 pt-10">
        <PlantArt kind="vine" size={220} className="absolute -right-12 -top-8" />
        <p className="relative text-heading font-bold text-cream/80">처음 오셨군요</p>
        <h1 className="relative mt-16 text-display font-extrabold text-cream">
          식물 친구를
          <br />
          맞이해요
        </h1>
      </section>
      <section className="rounded-t-panel bg-paper px-6 pb-10 pt-7">
        {isDemoMode && (
          <p className="mb-5 rounded-button bg-cream-soft px-4 py-3 text-caption text-leaf-900">
            데모 값 — 초대코드 <b>GREEN2026</b> · 디바이스 <b>PC-0009</b> · 페어링 코드 <b>{DEMO_PAIRING_CODE}</b>
          </p>
        )}
        <OnboardingForm species={species.map((s) => ({ id: s.id, name: s.name, art: s.art }))} />
      </section>
    </div>
  );
}
