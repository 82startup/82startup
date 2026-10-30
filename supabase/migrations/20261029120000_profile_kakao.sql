-- A member can add a KakaoTalk link (open chat, QR profile or channel) to their profile, shown like LinkedIn.
alter table public.profiles add column kakao_url text
  check (kakao_url is null or (kakao_url ~ '^https://(open|qr|pf)\.kakao\.com/[^[:space:]]+$' and char_length(kakao_url) <= 200));

grant select (kakao_url) on public.profiles to authenticated;
grant update (kakao_url) on public.profiles to authenticated;
