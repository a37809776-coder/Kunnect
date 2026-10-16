import { logout } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/data";

export default async function OrgSettingsPage() {
  const me = await requireRole("org_staff");
  const org = me.organizationId ? await (await getRepo()).getOrganization(me.organizationId) : null;
  return (
    <>
      <header className="rounded-bl-panel bg-leaf-500 px-5 pb-8 pt-5">
        <p className="text-heading font-bold text-cream/90">{org?.name}</p>
        <h1 className="mt-10 text-display font-extrabold text-cream">설정</h1>
      </header>
      <section className="space-y-4 px-5 pt-6">
        <div className="rounded-card bg-paper px-5 py-5">
          <p className="text-caption font-semibold text-leaf-700">담당자</p>
          <p className="text-heading font-bold text-leaf-900">{me.displayName}</p>
          {org && (
            <>
              <p className="mt-4 text-caption font-semibold text-leaf-700">참여자 초대코드</p>
              <p className="text-title font-extrabold tracking-wider text-leaf-700">{org.inviteCode}</p>
            </>
          )}
        </div>
        <form action={logout}>
          <button className="w-full rounded-button bg-leaf-100 py-3 text-body font-semibold text-leaf-700">로그아웃</button>
        </form>
      </section>
    </>
  );
}
