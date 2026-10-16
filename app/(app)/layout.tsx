import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { getRepo, simulatorEnabled } from "@/lib/data";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole("participant");
  const plants = await (await getRepo()).listPlants(me.id);
  if (plants.length === 0) redirect("/onboarding");

  const tabs = [
    { href: "/", label: "홈", icon: "home" as const },
    { href: "/messages", label: "메시지", icon: "chat" as const },
    ...(simulatorEnabled ? [{ href: "/simulator", label: "시뮬레이터", icon: "sim" as const }] : []),
    { href: "/settings/sharing", label: "설정", icon: "gear" as const },
  ];
  return <AppShell tabs={tabs}>{children}</AppShell>;
}
