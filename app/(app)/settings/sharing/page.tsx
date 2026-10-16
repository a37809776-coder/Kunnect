import { logout } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { withJosa } from "@/lib/ko";
import SharingForm from "./SharingForm";

export default async function SharingPage() {
  const me = await requireRole("participant");
  const repo = await getRepo();
  const org = me.organizationId ? await repo.getOrganization(me.organizationId) : null;
  const consent = me.organizationId ? await repo.getConsent(me.id, me.organizationId) : null;
  const active = !!consent?.agreedAt && !consent.revokedAt;

  return (
    <>
      <header className="rounded-bl-panel bg-leaf-500 px-5 pb-8 pt-5">
        <p className="text-heading font-bold text-cream/90">{me.displayName}님</p>
        <h1 className="mt-10 text-display font-extrabold text-cream">공유 설정</h1>
        <p className="mt-2 text-body text-leaf-50/85">
          {org ? `${withJosa(org.name, "과", "와")} 무엇을 나눌지 직접 정해요` : "연결된 기관이 없어요"}
        </p>
      </header>

      <section className="px-5 pt-6">
        {org && (
          <SharingForm
            orgName={org.name}
            initial={{
              shareCare: active && !!consent?.shareCareActivity,
              shareEnvironment: active && !!consent?.shareEnvironment,
              shareMood: active && !!consent?.shareMood,
            }}
          />
        )}
        <form action={logout} className="mt-10">
          <button className="w-full rounded-button bg-leaf-100 py-3 text-body font-semibold text-leaf-700">로그아웃</button>
        </form>
      </section>
    </>
  );
}
