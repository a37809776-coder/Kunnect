-- Supabase 보안 어드바이저 대응: SECURITY DEFINER 함수 실행 권한 정리
-- 트리거 함수는 API로 호출할 일이 없다
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- RLS 헬퍼는 정책 평가 때 로그인 사용자 권한으로 실행되므로 authenticated만 남긴다
revoke execute on function public.is_staff_of(uuid), public.staff_can_see(uuid, text) from public, anon;
grant execute on function public.is_staff_of(uuid), public.staff_can_see(uuid, text) to authenticated;
