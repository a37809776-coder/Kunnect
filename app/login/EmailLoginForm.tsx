"use client";

import { useActionState } from "react";
import { emailLogin } from "@/app/actions";

export default function EmailLoginForm() {
  const [state, action, pending] = useActionState(emailLogin, null);
  if (state?.ok) {
    return (
      <p className="rounded-card bg-leaf-100 px-5 py-6 text-body text-leaf-900">
        메일함을 확인해 주세요. 받은 링크를 누르면 바로 들어올 수 있어요 💌
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <h2 className="text-heading font-bold text-leaf-900">이메일로 시작하기</h2>
      <label className="block">
        <span className="text-caption font-semibold text-leaf-700">이메일</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-button border border-leaf-100 bg-leaf-50 px-4 py-3 text-body outline-none focus:border-leaf-500"
        />
      </label>
      {state && !state.ok && <p className="text-caption text-clay">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "보내는 중…" : "로그인 링크 받기"}
      </button>
    </form>
  );
}
