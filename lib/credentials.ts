// 이메일·비밀번호 로그인/가입 입력 규칙과 오류 문구 (ADR-007). 순수 모듈 — 단위 테스트 대상.
import { z } from "zod";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt 한계

const email = z.string().trim().toLowerCase().email("이메일 주소를 확인해 주세요");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(1, "이름을 입력해 주세요").max(20, "이름은 20자까지예요"),
    email,
    password: z
      .string()
      .min(PASSWORD_MIN, `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요`)
      .max(PASSWORD_MAX, `비밀번호는 ${PASSWORD_MAX}자까지예요`)
      .regex(/[A-Za-z]/, "비밀번호에 영문을 1자 이상 넣어 주세요")
      .regex(/[0-9]/, "비밀번호에 숫자를 1자 이상 넣어 주세요"),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "비밀번호가 서로 달라요",
    path: ["passwordConfirm"],
  });

export const formString = (fd: FormData, key: string) => String(fd.get(key) ?? "");

/** Supabase Auth 오류 → 사용자 문구. 로그인 실패는 이메일·비밀번호 중 무엇이 틀렸는지 구분하지 않는다 */
export function authErrorMessage(err: { code?: string; message?: string } | null | undefined): string {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "이메일 또는 비밀번호가 맞지 않아요";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "메일함에서 가입 확인 링크를 먼저 눌러 주세요";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered"))
    return "이미 가입된 이메일이에요. 로그인해 주세요";
  if (code === "weak_password" || msg.includes("password should"))
    return `더 안전한 비밀번호를 써 주세요 (${PASSWORD_MIN}자 이상, 영문·숫자 포함)`;
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || msg.includes("rate limit"))
    return "시도가 너무 많아요. 잠시 후 다시 해 주세요";
  if (code === "signup_disabled") return "지금은 새로 가입할 수 없어요. 기관 담당자에게 문의해 주세요";
  return "잠시 문제가 생겼어요. 다시 시도해 주세요";
}
