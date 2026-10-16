"use client";

import { useActionState, useState } from "react";
import { passwordSignIn, passwordSignUp } from "@/app/actions";
import { PASSWORD_MIN } from "@/lib/credentials";

const field =
  "mt-1 w-full rounded-button border border-leaf-100 bg-leaf-50 px-4 py-3 text-body outline-none placeholder:text-leaf-300 focus:border-leaf-500";

type Mode = "signin" | "signup";

/** 이메일·비밀번호 로그인 / 회원가입 (ADR-007) */
export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  return (
    <div>
      <div className="grid grid-cols-2 rounded-full bg-leaf-100 p-1 text-body font-bold" role="tablist" aria-label="로그인 방식">
        {(
          [
            ["signin", "로그인"],
            ["signup", "회원가입"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`rounded-full py-2.5 ${mode === k ? "bg-paper text-leaf-900 shadow" : "text-leaf-700"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">{mode === "signin" ? <SignInForm /> : <SignUpForm onDone={() => setMode("signin")} />}</div>
    </div>
  );
}

function PasswordInput({ name, label, autoComplete, hint }: { name: string; label: string; autoComplete: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="block">
      <span className="text-caption font-semibold text-leaf-700">{label}</span>
      <span className="relative block">
        <input
          name={name}
          type={shown ? "text" : "password"}
          required
          autoComplete={autoComplete}
          className={`${field} pr-16`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "비밀번호 숨기기" : "비밀번호 보기"}
          className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 rounded-badge px-2.5 py-1.5 text-caption font-semibold text-leaf-700"
        >
          {shown ? "숨기기" : "보기"}
        </button>
      </span>
      {hint && <span className="mt-1 block text-caption text-leaf-300">{hint}</span>}
    </label>
  );
}

function ErrorNote({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-button bg-clay/10 px-4 py-3 text-caption font-semibold text-clay">
      {text}
    </p>
  );
}

function SignInForm() {
  const [state, action, pending] = useActionState(passwordSignIn, null);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-caption font-semibold text-leaf-700">이메일</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" className={field} />
      </label>
      <PasswordInput name="password" label="비밀번호" autoComplete="current-password" />
      <ErrorNote text={state && !state.ok ? state.error : undefined} />
      <button disabled={pending} className="w-full rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream disabled:opacity-60">
        {pending ? "로그인하는 중…" : "로그인"}
      </button>
    </form>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(passwordSignUp, null);
  if (state?.ok && state.data?.needsEmailConfirm) {
    return (
      <div className="space-y-4">
        <p className="rounded-card bg-leaf-100 px-5 py-6 text-body text-leaf-900">
          가입 확인 메일을 보냈어요 💌 메일의 링크를 누른 뒤 이메일과 비밀번호로 로그인해 주세요.
        </p>
        <button type="button" onClick={onDone} className="w-full rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream">
          로그인하러 가기
        </button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-caption font-semibold text-leaf-700">이름 (기관 담당자에게 보이는 이름)</span>
        <input name="displayName" required maxLength={20} autoComplete="nickname" className={field} />
      </label>
      <label className="block">
        <span className="text-caption font-semibold text-leaf-700">이메일</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" className={field} />
      </label>
      <PasswordInput
        name="password"
        label="비밀번호"
        autoComplete="new-password"
        hint={`${PASSWORD_MIN}자 이상, 영문과 숫자를 함께 써 주세요`}
      />
      <PasswordInput name="passwordConfirm" label="비밀번호 확인" autoComplete="new-password" />
      <ErrorNote text={state && !state.ok ? state.error : undefined} />
      <button disabled={pending} className="w-full rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream disabled:opacity-60">
        {pending ? "가입하는 중…" : "가입하기"}
      </button>
    </form>
  );
}
