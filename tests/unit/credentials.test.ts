// test.md AUTH-01 ~ AUTH-08 (입력 규칙·오류 문구)
import { describe, expect, it } from "vitest";
import { authErrorMessage, signInSchema, signUpSchema } from "@/lib/credentials";

const ok = { displayName: "하늘", email: "Sky@Example.com ", password: "garden2026", passwordConfirm: "garden2026" };
const firstError = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0].message;

describe("가입 입력 규칙", () => {
  it("AUTH-01 올바른 입력은 통과하고 이메일은 소문자·공백 제거", () => {
    const r = signUpSchema.safeParse(ok);
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("sky@example.com");
  });
  it("AUTH-02 비밀번호 8자 미만 거부", () => {
    expect(firstError(signUpSchema.safeParse({ ...ok, password: "ab12", passwordConfirm: "ab12" }))).toContain("8자 이상");
  });
  it("AUTH-03 영문 또는 숫자가 없으면 거부", () => {
    expect(firstError(signUpSchema.safeParse({ ...ok, password: "12345678", passwordConfirm: "12345678" }))).toContain("영문");
    expect(firstError(signUpSchema.safeParse({ ...ok, password: "abcdefgh", passwordConfirm: "abcdefgh" }))).toContain("숫자");
  });
  it("AUTH-04 비밀번호 확인 불일치 거부", () => {
    expect(firstError(signUpSchema.safeParse({ ...ok, passwordConfirm: "garden2027" }))).toBe("비밀번호가 서로 달라요");
  });
  it("AUTH-05 이름·이메일 형식", () => {
    expect(firstError(signUpSchema.safeParse({ ...ok, displayName: " " }))).toBe("이름을 입력해 주세요");
    expect(firstError(signUpSchema.safeParse({ ...ok, email: "not-an-email" }))).toBe("이메일 주소를 확인해 주세요");
  });
});

describe("로그인 입력 규칙", () => {
  it("AUTH-06 비밀번호 빈 값 거부, 형식 검사는 하지 않음(기존 계정 보호)", () => {
    expect(firstError(signInSchema.safeParse({ email: "a@b.co", password: "" }))).toBe("비밀번호를 입력해 주세요");
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("Supabase 오류 문구", () => {
  it("AUTH-07 로그인 실패는 무엇이 틀렸는지 구분하지 않음", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("이메일 또는 비밀번호가 맞지 않아요");
    expect(authErrorMessage({ message: "Invalid login credentials" })).toBe("이메일 또는 비밀번호가 맞지 않아요");
  });
  it("AUTH-08 주요 오류 코드", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" })).toContain("가입 확인 링크");
    expect(authErrorMessage({ code: "user_already_exists" })).toContain("이미 가입된");
    expect(authErrorMessage({ code: "weak_password" })).toContain("안전한 비밀번호");
    expect(authErrorMessage({ code: "over_request_rate_limit" })).toContain("잠시 후");
    expect(authErrorMessage({ code: "something_else" })).toBe("잠시 문제가 생겼어요. 다시 시도해 주세요");
  });
});
