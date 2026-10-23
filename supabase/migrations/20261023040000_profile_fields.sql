-- Member type: Postgres cannot drop enum values, so build the new type, convert, and swap.
create type public.member_type_new as enum ('startup', 'investor', 'student', 'corporate', 'institution', 'other');

alter table public.profiles
  alter column member_type type public.member_type_new
  using (
    case member_type::text
      when 'founder' then 'startup'
      when 'investor' then 'investor'
      when 'talent' then 'other'
      when 'attendee' then 'other'
    end
  )::public.member_type_new;

drop type public.member_type;
alter type public.member_type_new rename to member_type;

-- Headline becomes the job title.
alter table public.profiles rename column headline to job_title;
alter table public.profiles rename constraint profiles_headline_check to profiles_job_title_check;

-- Optional company website: http or https, no spaces, at most 200 characters.
alter table public.profiles
  add column company_website text
  check (company_website is null or (company_website ~ '^https?://\S+$' and char_length(company_website) <= 200));

grant update (company_website) on public.profiles to authenticated;
