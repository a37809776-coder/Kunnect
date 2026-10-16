import { redirect } from "next/navigation";
import { demoLogin } from "@/app/actions";
import PlantArt from "@/components/PlantArt";
import { ChevronIcon } from "@/components/Icons";
import { currentProfile } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { DEMO_ACCOUNTS } from "@/lib/data/demo";
import EmailLoginForm from "./EmailLoginForm";

export default async function LoginPage() {
  const me = await currentProfile();
  if (me) redirect(me.role === "org_staff" ? "/org" : "/");

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-leaf-500">
      <section className="relative overflow-hidden px-6 pb-10 pt-16">
        <PlantArt kind="succulent" size={260} className="absolute -right-16 -top-6" />
        <p className="relative text-heading font-bold text-cream/80">플랜트커넥트</p>
        <h1 className="relative mt-24 text-display font-extrabold text-cream">
          식물이
          <br />
          먼저 말을 걸어요
        </h1>
        <p className="relative mt-4 max-w-[260px] text-body text-leaf-50/85">
          원예테라피가 끝나도, 일상에서 식물과 마음을 천천히 이어가요.
        </p>
      </section>

      <section className="flex-1 rounded-t-panel bg-paper px-6 pb-10 pt-8">
        {isDemoMode ? (
          <>
            <h2 className="text-heading font-bold text-leaf-900">데모 계정으로 둘러보기</h2>
            <p className="mt-1 text-caption text-leaf-700">Supabase 연결 전이라 메모리 데이터로 실행 중이에요.</p>
            <ul className="mt-5 space-y-3">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.id}>
                  <form action={demoLogin}>
                    <input type="hidden" name="userId" value={a.id} />
                    <button className="flex w-full items-center justify-between rounded-card bg-leaf-500 px-5 py-4 text-left text-cream shadow-float transition active:scale-[.98]">
                      <span>
                        <span className="block text-heading font-bold">{a.label}</span>
                        <span className="block text-caption text-leaf-50/80">{a.hint}</span>
                      </span>
                      <span className="grid h-11 w-11 place-items-center rounded-button bg-paper text-leaf-700">
                        <ChevronIcon />
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmailLoginForm />
        )}
      </section>
    </div>
  );
}
