import AppShell from "@/components/AppShell";
import { requireRole } from "@/lib/auth";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  await requireRole("org_staff");
  return (
    <AppShell
      tabs={[
        { href: "/org", label: "현황", icon: "users" },
        { href: "/org/settings", label: "설정", icon: "gear" },
      ]}
    >
      {children}
    </AppShell>
  );
}
