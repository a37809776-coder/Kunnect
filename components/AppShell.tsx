"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChatIcon, GearIcon, HomeIcon, SlidersIcon, UsersIcon } from "./Icons";

type Tab = { href: string; label: string; icon: "home" | "chat" | "sim" | "gear" | "users" };
const ICONS = { home: HomeIcon, chat: ChatIcon, sim: SlidersIcon, gear: GearIcon, users: UsersIcon };

/** 공통 앱 셸 — 최대 480px, 데스크톱에서는 가운데 폰 폭 (웹 레이아웃 없음) */
export default function AppShell({ tabs, children }: { tabs: Tab[]; children: ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" || href === "/org" ? path === href : path.startsWith(href));
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-leaf-50 shadow-[0_0_60px_rgb(31_51_32/0.15)]">
      <main className="flex-1 pb-24">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] rounded-t-card bg-paper px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 shadow-[0_-8px_24px_-12px_rgb(31_51_32/0.25)]"
        aria-label="주요 메뉴"
      >
        <ul className="flex justify-around">
          {tabs.map((t) => {
            const Icon = ICONS[t.icon];
            const on = isActive(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex w-16 flex-col items-center gap-1 rounded-button py-1.5 text-[11px] font-semibold ${
                    on ? "text-leaf-700" : "text-leaf-300"
                  }`}
                >
                  <span className={`grid h-9 w-12 place-items-center rounded-full ${on ? "bg-leaf-100" : ""}`}>
                    <Icon size={22} />
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
